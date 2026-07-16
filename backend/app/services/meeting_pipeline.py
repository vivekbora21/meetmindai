import os
import time
import json
import logging
from sqlalchemy.orm import Session
from app.models.models import (
    Meeting,
    Transcript,
    ActionItem,
    Decision,
    Risk,
    Question,
    User,
    MeetingSpeaker,
)

from app.services.media_service import MediaService
from app.services.whisper_service import WhisperService
from app.repositories.transcript_repository import TranscriptRepository
from app.services.ai.gemini_service import GeminiService
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
        self.gemini_service = GeminiService()
        self.embedding_service = EmbeddingService()
        self.kg_service = KnowledgeGraphService()

    def run_transcription_stage(
        self, db: Session, meeting_id: str, file_path: str, task_id: str
    ) -> None:
        """
        Stage 1: Verify Media -> FFmpeg -> Whisper -> Save Transcript incrementally -> Diarize & Map Speakers.
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

        # Clear old transcript data first for idempotency
        db.query(Transcript).filter(Transcript.meeting_id == meeting_id).delete()
        db.query(MeetingSpeaker).filter(
            MeetingSpeaker.meeting_id == meeting_id
        ).delete()
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

            # 3. Transcribe via Whisper incrementally
            info_container = {}
            segments = []
            forced_language = (
                meeting.language
                if meeting.language and meeting.language.lower() != "auto"
                else None
            )

            logger.info(
                f"Triggering Whisper incremental transcription. forced_language={forced_language}"
            )
            for seg in self.whisper_service.transcribe_stream(
                audio_to_transcribe,
                forced_language=forced_language,
                info_container=info_container,
            ):
                segments.append(seg)
                self.transcript_repo.save_segment_incremental(
                    db, meeting_id, seg, seg["speaker_tag"]
                )
                db.commit()  # Commit incrementally for real-time UI

            duration_seconds = 0
            if segments:
                duration_seconds = max(0, int(segments[-1]["end_ms"] / 1000))

            # Store detected language metadata
            detected_lang = info_container.get("language")
            lang_prob = info_container.get("language_probability", 0.0)
            logger.info(
                f"Whisper auto-detected language: {detected_lang} (probability: {lang_prob:.3f})"
            )

            if not forced_language:
                meeting.language = detected_lang
            else:
                meeting.language = forced_language
            db.commit()

            # 4. Use Speaker Diarization and Speaker Mapping to assign speaker names
            logger.info("Running speaker diarization and mapping...")
            from app.services.transcription.speaker_diarization import (
                SpeakerDiarizationService,
            )
            from app.services.transcription.speaker_mapping import SpeakerMappingService

            diarizer = SpeakerDiarizationService()
            mapper = SpeakerMappingService()

            diarized_segments = diarizer.diarize(audio_to_transcribe, segments)
            speaker_mapping = mapper.map_speakers_to_historical(
                db, meeting.organization_id, meeting_id, diarized_segments
            )

            # Calculate speaker contribution percentages
            total_duration_ms = sum(
                seg["end_ms"] - seg["start_ms"] for seg in diarized_segments
            )
            speaker_durations = {}
            for seg in diarized_segments:
                spk_num = seg["speaker_number"]
                speaker_durations[spk_num] = speaker_durations.get(spk_num, 0) + (
                    seg["end_ms"] - seg["start_ms"]
                )

            # Map the contributions and check for conflicts
            historical_names_mapped = {}
            for spk_num, info in speaker_mapping.items():
                dur = speaker_durations.get(spk_num, 0)
                pct = (
                    (dur / total_duration_ms * 100.0) if total_duration_ms > 0 else 0.0
                )
                info["contribution_percentage"] = round(pct, 2)
                info["has_conflict"] = False
                info["conflict_details"] = None

                if info["is_confirmed"]:
                    name = info["display_name"]
                    if name in historical_names_mapped:
                        historical_names_mapped[name].append(spk_num)
                    else:
                        historical_names_mapped[name] = [spk_num]

            # Flag conflicts if same name is mapped to multiple speaker numbers
            for name, spk_nums in historical_names_mapped.items():
                if len(spk_nums) > 1:
                    for num in spk_nums:
                        speaker_mapping[num]["has_conflict"] = True
                        speaker_mapping[num][
                            "conflict_details"
                        ] = f"Conflict: Multiple speakers mapped to historical name '{name}'."

            # 5. Finalize the transcript: updates all segment records and speakers
            db_writes = self.transcript_repo.finalize_transcript(
                db, meeting_id, diarized_segments, speaker_mapping, duration_seconds
            )

            # Set status to TRANSCRIBED and commit
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

        # Retrieve segments
        segments = (
            db.query(Transcript)
            .filter(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.start_time)
            .all()
        )
        if not segments:
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
            speaker_name = (
                seg.speaker.display_name if seg.speaker else f"Speaker {seg.speaker_id}"
            )
            transcript_text += f"{speaker_name}: {seg.text}\n"

        # Check Cache
        if meeting.executive_summary and meeting.ai_status == "SUCCESS":
            logger.info(
                f"MeetingPipeline | AI analysis already success for meeting {meeting_id}. Reusing cached insights."
            )

            action_items = []
            for a in meeting.action_items:
                assigned_name = a.assigned_user.name if a.assigned_user else ""
                action_items.append(
                    {
                        "description": a.description,
                        "assigned_to": assigned_name,
                        "priority": a.priority,
                        "confidence_score": a.confidence_score or 1.0,
                    }
                )

            decisions = []
            for d in meeting.decisions:
                decisions.append(
                    {
                        "decision_text": d.decision_text,
                        "rationale": d.rationale,
                        "confidence_score": d.confidence_score or 1.0,
                    }
                )

            risks = []
            for r in meeting.risks:
                risks.append(
                    {
                        "risk_text": r.risk_text,
                        "mitigation": r.mitigation,
                        "severity": r.severity,
                    }
                )

            questions = [q.question_text for q in meeting.questions]
            agenda_items = meeting.agenda_items or []
            technical_context = meeting.technical_context or {
                "repositories": [],
                "files": [],
                "apis": [],
                "database_tables": [],
                "services": [],
                "libraries": [],
            }

            insights = {
                "executive_summary": meeting.executive_summary,
                "one_minute_read": [
                    line.strip()[2:] if line.strip().startswith("- ") else line.strip()
                    for line in meeting.one_minute_read.split("\n")
                    if line.strip()
                ],
                "sentiment_summary": meeting.sentiment_summary,
                "action_items": action_items,
                "decisions": decisions,
                "risks": risks,
                "questions": questions,
                "agenda_items": agenda_items,
                "technical_context": technical_context,
            }

            meeting.status = "TRANSCRIBED"
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                stage="AI_ANALYSIS",
                meeting_id=meeting_id,
                task_id=task_id,
                duration=duration,
                transcript_length=len(transcript_text),
                llm_model=self.gemini_service.model_name + " (CACHED)",
                db_writes=0,
            )
            return insights

        # Update meeting and AI status
        meeting.status = "ANALYZING"
        meeting.ai_status = "RUNNING"
        db.commit()

        try:
            # Run GeminiService
            insights = self.gemini_service.extract_meeting_insights(transcript_text)

            # Write insights in transaction
            # Delete old items first
            db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).delete()
            db.query(Decision).filter(Decision.meeting_id == meeting_id).delete()
            db.query(Risk).filter(Risk.meeting_id == meeting_id).delete()
            db.query(Question).filter(Question.meeting_id == meeting_id).delete()

            is_success = (
                insights.get("status") != "Gemini service temporarily unavailable"
            )

            if is_success:
                meeting.executive_summary = insights.get("executive_summary", "")

                # Update title if extracted successfully and original is empty/default
                extracted_title = insights.get("meeting_title")
                if extracted_title and extracted_title.strip():
                    if (
                        not meeting.title
                        or not meeting.title.strip()
                        or meeting.title.lower().strip()
                        in (
                            "untitled",
                            "untitled meeting",
                            "new meeting",
                            "none",
                            "null",
                        )
                    ):
                        meeting.title = extracted_title.strip()

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

                # Save new agenda_items (timeline) and technical_context fields
                meeting.agenda_items = insights.get("agenda_items", [])
                meeting.technical_context = insights.get("technical_context", {})
                meeting.key_themes = insights.get("key_themes", [])
                meeting.main_takeaways = insights.get("main_takeaways", [])
                meeting.important_quotes = insights.get("important_quotes", [])

                # Build followup email
                email_text = f"Hi team,\n\nFollowing up on our session today, here is the summary:\n\n{meeting.executive_summary}\n\nKey Action Items:\n"
                for act in insights.get("action_items", []):
                    email_text += f"- {act.get('description', '')} ({act.get('assigned_to', 'Unassigned')})\n"
                email_text += "\nBest regards,\nMeetingMind AI"
                meeting.followup_email = email_text

                # Insert Action Items
                db_writes = 0
                for act in insights.get("action_items", []):
                    desc = act.get("description", "").strip()
                    if not desc or desc.lower() == "not discussed":
                        continue
                    status_val = act.get("status", "Pending")
                    if not status_val or status_val.lower() == "not discussed":
                        status_val = "Pending"
                    priority_val = act.get("priority", "Medium")
                    if not priority_val or priority_val.lower() == "not discussed":
                        priority_val = "Medium"

                    action = ActionItem(
                        meeting_id=meeting_id,
                        description=desc,
                        status=status_val,
                        priority=priority_val,
                        due_date=None,
                        confidence_score=act.get("confidence_score", 1.0),
                    )
                    assigned_name = act.get("assigned_to", "")
                    if assigned_name and assigned_name.lower() != "not discussed":
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
                    dec_text = dec.get("decision_text", "").strip()
                    if not dec_text or dec_text.lower() == "not discussed":
                        continue
                    rationale_val = dec.get("rationale", "")
                    if rationale_val and rationale_val.lower() == "not discussed":
                        rationale_val = ""
                    decision = Decision(
                        meeting_id=meeting_id,
                        decision_text=dec_text,
                        rationale=rationale_val,
                        confidence_score=dec.get("confidence_score", 1.0),
                    )
                    db.add(decision)
                    db_writes += 1

                # Insert Risks
                for rsk in insights.get("risks", []):
                    rsk_text = rsk.get("risk_text", "").strip()
                    if not rsk_text or rsk_text.lower() == "not discussed":
                        continue
                    mitigation_val = rsk.get("mitigation", "")
                    if mitigation_val and mitigation_val.lower() == "not discussed":
                        mitigation_val = ""
                    severity_val = rsk.get("severity", "Medium")
                    if not severity_val or severity_val.lower() == "not discussed":
                        severity_val = "Medium"
                    risk = Risk(
                        meeting_id=meeting_id,
                        risk_text=rsk_text,
                        mitigation=mitigation_val,
                        severity=severity_val,
                    )
                    db.add(risk)
                    db_writes += 1

                # Insert Questions
                for q in insights.get("questions", []):
                    q_text = q.strip() if isinstance(q, str) else ""
                    if not q_text or q_text.lower() == "not discussed":
                        continue
                    question = Question(meeting_id=meeting_id, question_text=q_text)
                    db.add(question)
                    db_writes += 1

                logger.info(f"AI saved | Meeting ID: {meeting_id}")
                db.commit()
                logger.info(f"Database committed | Meeting ID: {meeting_id}")

                meeting.ai_status = "SUCCESS"
                db.commit()
                logger.info(
                    f"Meeting updated | Meeting ID: {meeting_id} | ai_status: {meeting.ai_status}"
                )
            else:
                # LLM Failure
                db_writes = 0
                meeting.executive_summary = "AI analysis unavailable."
                meeting.one_minute_read = ""
                meeting.sentiment_summary = "AI analysis unavailable."
                meeting.followup_email = ""
                meeting.agenda_items = []
                meeting.technical_context = {}
                meeting.key_themes = []
                meeting.main_takeaways = []
                meeting.important_quotes = []
                meeting.ai_status = "FAILED"
                db.commit()
                logger.info(
                    f"Meeting updated | Meeting ID: {meeting_id} | ai_status: {meeting.ai_status} (FAILED)"
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
                llm_model=self.gemini_service.model_name,
                db_writes=db_writes,
            )
            return insights

        except Exception as e:
            db.rollback()
            meeting.status = "TRANSCRIBED"
            meeting.ai_status = "FAILED"
            meeting.executive_summary = "AI analysis unavailable."
            meeting.one_minute_read = ""
            meeting.sentiment_summary = "AI analysis unavailable."
            meeting.followup_email = ""
            meeting.agenda_items = []
            meeting.technical_context = {}
            meeting.key_themes = []
            meeting.main_takeaways = []
            meeting.important_quotes = []
            db.commit()

            duration = time.time() - start_time
            log_pipeline_stage(
                "AI_ANALYSIS", meeting_id, task_id, duration, failure=str(e)
            )
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
        self,
        db: Session,
        meeting_id: str,
        task_id: str,
        technical_context: dict = None,
        knowledge_graph: dict = None,
    ) -> None:
        """
        Stage 4: Update Knowledge Graph.
        """
        start_time = time.time()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        try:
            self.kg_service.update_knowledge_graph(
                db, meeting_id, technical_context, knowledge_graph
            )
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
