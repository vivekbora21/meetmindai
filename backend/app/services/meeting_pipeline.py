import os
import time
import json
import logging
from sqlalchemy.orm import Session
from app.models.models import (
    Meeting,
    TranscriptSegment,
    ActionItem,
    Decision,
    Risk,
    Question,
    User,
)

from app.services.media_service import MediaService
from app.services.whisper_service import WhisperService
from app.services.transcript_repository import TranscriptRepository
from app.services.openrouter_service import OpenRouterService
from app.services.embedding_service import EmbeddingService
from app.services.knowledge_graph_service import KnowledgeGraphService

logger = logging.getLogger(__name__)


def log_pipeline_stage(
    stage: str,
    meeting_id: str,
    task_id: str,
    duration: float,
    transcript_length: int = None,
    llm_model: str = None,
    embedding_model: str = None,
    db_writes: int = None,
    failure: str = None,
    retries: int = 0,
):
    log_data = {
        "stage": stage,
        "meeting_id": meeting_id,
        "task_id": task_id,
        "duration_seconds": round(duration, 3),
        "transcript_length": transcript_length,
        "llm_model": llm_model,
        "embedding_model": embedding_model,
        "db_writes": db_writes,
        "failure": failure,
        "retries": retries,
    }
    logger.info(f"PIPELINE_LOG | {json.dumps(log_data)}")
    print(f"[PipelineLog] {stage} | {json.dumps(log_data)}")


class MeetingPipeline:
    def __init__(self):
        self.media_service = MediaService()
        self.whisper_service = WhisperService()
        self.transcript_repo = TranscriptRepository()
        self.openrouter_service = OpenRouterService()
        self.embedding_service = EmbeddingService()
        self.kg_service = KnowledgeGraphService()

    def run_transcription_stage(
        self, db: Session, meeting_id: str, file_path: str, task_id: str
    ) -> None:
        """
        Stage 1: Verify Media -> FFmpeg -> Whisper -> Save Transcript immediately.
        """
        start_time = time.time()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found.")
            return

        # 1. Verify media exists
        verified_path = self.media_service.verify_recording_exists(db, meeting_id)
        if not verified_path:
            err_msg = f"Meeting recording not found for meeting {meeting_id}."
            logger.error(err_msg)
            meeting.status = "FAILED"
            db.commit()
            log_pipeline_stage(
                "TRANSCRIPTION",
                meeting_id,
                task_id,
                time.time() - start_time,
                failure=err_msg,
            )
            raise FileNotFoundError(err_msg)

        # Update meeting status to PROCESSING
        meeting.status = "PROCESSING"
        meeting.ai_status = "PENDING"
        meeting.embedding_status = "PENDING"
        db.commit()

        # Temp path for extracted WAV
        uploads_dir = self.media_service.get_uploads_dir()
        extracted_wav_path = os.path.join(uploads_dir, f"{meeting_id}_extracted.wav")

        try:
            # 2. Extract audio via FFmpeg
            extraction_success = self.media_service.extract_audio(
                verified_path, extracted_wav_path
            )
            audio_to_transcribe = (
                extracted_wav_path if extraction_success else verified_path
            )

            if not extraction_success:
                logger.warning(
                    f"FFmpeg extraction failed, falling back to original media path: {verified_path}"
                )

            # 3. Transcribe via Whisper
            segments = self.whisper_service.transcribe(audio_to_transcribe)
            duration_seconds = 0
            if segments:
                duration_seconds = max(0, int(segments[-1]["end_ms"] / 1000))

            # 4. Save transcript in db transaction
            # Begin transaction is automatic; we delegate deletes/inserts to repo and commit here
            db_writes = self.transcript_repo.save_transcript(
                db, meeting_id, segments, duration_seconds
            )

            # 5. Set status to TRANSCRIBED and commit
            meeting.status = "TRANSCRIBED"
            db.commit()

            duration = time.time() - start_time
            transcript_text = "\n".join(seg["text"] for seg in segments)
            log_pipeline_stage(
                stage="TRANSCRIPTION",
                meeting_id=meeting_id,
                task_id=task_id,
                duration=duration,
                transcript_length=len(transcript_text),
                db_writes=db_writes,
            )

        except Exception as e:
            db.rollback()
            meeting.status = "FAILED"
            db.commit()
            duration = time.time() - start_time
            log_pipeline_stage(
                "TRANSCRIPTION", meeting_id, task_id, duration, failure=str(e)
            )
            raise e
        finally:
            # Cleanup temp file
            if os.path.exists(extracted_wav_path):
                try:
                    os.remove(extracted_wav_path)
                except Exception as cleanup_err:
                    logger.warning(f"Failed to remove temp WAV file: {cleanup_err}")

    def run_ai_analysis_stage(self, db: Session, meeting_id: str, task_id: str) -> dict:
        """
        Stage 2: Run LLM summary and insights extraction using OpenRouter.
        """
        start_time = time.time()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return {}

        # Update meeting and AI status
        meeting.status = "ANALYZING"
        meeting.ai_status = "RUNNING"
        db.commit()

        # Retrieve segments
        segments = (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.start_ms)
            .all()
        )
        if not segments:
            # No segments: skip AI stage
            meeting.status = "TRANSCRIBED"
            meeting.ai_status = "SKIPPED"
            db.commit()
            log_pipeline_stage(
                "AI_ANALYSIS",
                meeting_id,
                task_id,
                time.time() - start_time,
                transcript_length=0,
            )
            return {}

        transcript_text = ""
        for seg in segments:
            # We don't have hardcoded speaker names, just speaker tag
            transcript_text += f"{seg.speaker_tag}: {seg.text}\n"

        try:
            # Run OpenRouter
            insights = self.openrouter_service.extract_meeting_insights(transcript_text)

            # Write insights in transaction
            # Delete old items first
            db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).delete()
            db.query(Decision).filter(Decision.meeting_id == meeting_id).delete()
            db.query(Risk).filter(Risk.meeting_id == meeting_id).delete()
            db.query(Question).filter(Question.meeting_id == meeting_id).delete()

            is_success = insights.get("status") != "LLM temporarily unavailable"

            if is_success:
                meeting.executive_summary = insights.get("executive_summary", "")

                one_min_read = insights.get("one_minute_read", [])
                if isinstance(one_min_read, list):
                    meeting.one_minute_read = "\n".join(
                        f"- {item}" for item in one_min_read
                    )
                else:
                    meeting.one_minute_read = str(one_min_read)

                meeting.sentiment_summary = insights.get(
                    "sentiment_summary", "Collaborative meeting."
                )

                # Build followup email
                email_text = f"Hi team,\n\nFollowing up on our session today, here is the summary:\n\n{meeting.executive_summary}\n\nKey Action Items:\n"
                for act in insights.get("action_items", []):
                    email_text += f"- {act.get('description', '')} ({act.get('assigned_to', 'Unassigned')})\n"
                email_text += "\nBest regards,\nMeetingMind AI"
                meeting.followup_email = email_text

                # Insert Action Items
                db_writes = 0
                for act in insights.get("action_items", []):
                    action = ActionItem(
                        meeting_id=meeting_id,
                        description=act.get("description", ""),
                        status="Pending",
                        priority=act.get("priority", "Medium"),
                        due_date=None,
                        confidence_score=act.get("confidence_score", 1.0),
                    )
                    assigned_name = act.get("assigned_to", "")
                    if assigned_name:
                        assigned_user = (
                            db.query(User)
                            .filter(User.name.ilike(f"%{assigned_name}%"))
                            .first()
                        )
                        if assigned_user:
                            action.assigned_to = assigned_user.id
                    db.add(action)
                    db_writes += 1

                # Insert Decisions
                for dec in insights.get("decisions", []):
                    decision = Decision(
                        meeting_id=meeting_id,
                        decision_text=dec.get("decision_text", ""),
                        rationale=dec.get("rationale", ""),
                        confidence_score=dec.get("confidence_score", 1.0),
                    )
                    db.add(decision)
                    db_writes += 1

                # Insert Risks
                for rsk in insights.get("risks", []):
                    risk = Risk(
                        meeting_id=meeting_id,
                        risk_text=rsk.get("risk_text", ""),
                        mitigation=rsk.get("mitigation", ""),
                        severity=rsk.get("severity", "Medium"),
                    )
                    db.add(risk)
                    db_writes += 1

                # Insert Questions
                for q in insights.get("questions", []):
                    question = Question(meeting_id=meeting_id, question_text=q)
                    db.add(question)
                    db_writes += 1

                meeting.ai_status = "SUCCESS"
                logger.info(
                    f"MeetingPipeline | Meeting ID: {meeting_id} | Saved extracted AI insights."
                )
            else:
                # LLM Failure
                db_writes = 0
                meeting.executive_summary = "AI analysis unavailable."
                meeting.one_minute_read = ""
                meeting.sentiment_summary = "AI analysis unavailable."
                meeting.followup_email = ""
                meeting.ai_status = "FAILED"
                logger.warning(
                    f"MeetingPipeline | Meeting ID: {meeting_id} | OpenRouter failed. Set AI status = FAILED."
                )

            # Set status back to TRANSCRIBED and commit
            meeting.status = "TRANSCRIBED"
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                stage="AI_ANALYSIS",
                meeting_id=meeting_id,
                task_id=task_id,
                duration=duration,
                transcript_length=len(transcript_text),
                llm_model=(
                    self.openrouter_service.models[0]
                    if self.openrouter_service.provider == "openrouter"
                    else get_env("QWEN_MODEL", "qwen2.5:latest")
                ),
                db_writes=db_writes,
            )
            return insights

        except Exception as e:
            db.rollback()
            meeting.status = "TRANSCRIBED"
            meeting.ai_status = "FAILED"
            # Keep empty AI fields on exception
            meeting.executive_summary = "AI analysis unavailable."
            meeting.one_minute_read = ""
            meeting.sentiment_summary = "AI analysis unavailable."
            meeting.followup_email = ""
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                "AI_ANALYSIS", meeting_id, task_id, duration, failure=str(e)
            )
            # Do not raise exception, we degrade gracefully and continue to embeddings/KG!
            return {}

    def run_embeddings_stage(self, db: Session, meeting_id: str, task_id: str) -> None:
        """
        Stage 3: Generate segment vector embeddings.
        """
        start_time = time.time()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        meeting.embedding_status = "RUNNING"
        db.commit()

        try:
            db_writes = self.embedding_service.update_segments_embeddings(
                db, meeting_id
            )
            meeting.embedding_status = "SUCCESS"
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                stage="EMBEDDINGS",
                meeting_id=meeting_id,
                task_id=task_id,
                duration=duration,
                embedding_model="nomic-embed-text-v1",
                db_writes=db_writes,
            )
        except Exception as e:
            db.rollback()
            meeting.embedding_status = "FAILED"
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                "EMBEDDINGS", meeting_id, task_id, duration, failure=str(e)
            )

    def run_knowledge_graph_stage(
        self, db: Session, meeting_id: str, task_id: str, technical_context: dict = None
    ) -> None:
        """
        Stage 4: Update Knowledge Graph.
        """
        start_time = time.time()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        try:
            self.kg_service.update_knowledge_graph(db, meeting_id, technical_context)
            meeting.status = "COMPLETED"
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                stage="KNOWLEDGE_GRAPH",
                meeting_id=meeting_id,
                task_id=task_id,
                duration=duration,
            )
        except Exception as e:
            db.rollback()
            meeting.status = "FAILED"
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                "KNOWLEDGE_GRAPH", meeting_id, task_id, duration, failure=str(e)
            )
