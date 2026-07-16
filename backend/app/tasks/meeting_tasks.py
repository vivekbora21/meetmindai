import logging
import os
import time
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.celery_app import celery_app
from app.database.connection import SessionLocal
from app.models.models import (
    Meeting,
    Transcript,
    MeetingSpeaker,
    ActionItem,
    Decision,
    Risk,
    Question,
    User,
    ScheduledMeeting,
    AgentLiveSession,
    KnowledgeGraphNode,
    KnowledgeGraphEdge,
)
from app.services.media_service import MediaService
from app.services.whisper_service import WhisperService
from app.repositories.transcript_repository import TranscriptRepository
from app.services.transcription.speaker_diarization import SpeakerDiarizationService
from app.services.transcription.speaker_mapping import SpeakerMappingService
from app.services.embedding_service import EmbeddingService
from app.services.ai.gemini_service import GeminiService
from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.cache_service import MeetingContextCache

logger = logging.getLogger(__name__)


def _normalize_platform(platform: str) -> str:
    platform = (platform or "").lower()
    if "teams" in platform:
        return "Teams"
    if "meet" in platform:
        return "Google Meet"
    if "zoom" in platform:
        return "Zoom"
    return "Unknown"


def _set_progress_state(meeting: Meeting, field: str, value: str) -> None:
    setattr(meeting, field, value)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def transcribe_audio(self, meeting_id: str, file_path: str):
    """
    Asynchronous transcription task. Resets statuses, extracts audio,
    transcribes using Whisper, and saves transcripts incrementally.
    On success, triggers downstream tasks in parallel.
    """
    db: Session = SessionLocal()
    start_time = time.time()
    try:
        logger.info(
            f"CeleryTask | transcribe_audio | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found.")
            return

        meeting.status = "PROCESSING"
        meeting.transcript_status = "RUNNING"
        meeting.speaker_status = "PENDING"
        meeting.embedding_status = "PENDING"
        meeting.ai_status = "PENDING"
        meeting.kg_status = "PENDING"
        meeting.executive_summary_status = "PENDING"
        meeting.action_items_status = "PENDING"
        meeting.decisions_status = "PENDING"
        meeting.risks_status = "PENDING"
        meeting.technical_status = "PENDING"
        meeting.key_themes_status = "PENDING"
        db.commit()

        # Clear old transcript data for idempotency
        db.query(Transcript).filter(Transcript.meeting_id == meeting_id).delete()
        db.query(MeetingSpeaker).filter(
            MeetingSpeaker.meeting_id == meeting_id
        ).delete()
        db.commit()

        media_service = MediaService()
        verified_path = media_service.verify_recording_exists(db, meeting_id)
        if not verified_path:
            # Try file_path if verify_recording_exists is None (e.g. for uploads that haven't registered fully)
            verified_path = (
                file_path if file_path and os.path.exists(file_path) else None
            )

        if not verified_path:
            raise FileNotFoundError(
                f"Recording file not found for meeting {meeting_id}"
            )

        uploads_dir = media_service.get_uploads_dir()
        extracted_wav_path = os.path.join(
            uploads_dir, f"{meeting_id}_transcribe_extracted.wav"
        )

        from app.utils.logging_pipeline import PipelineTracker
        tracker = PipelineTracker(meeting_id)

        try:
            tracker.start_stage(2)  # Stage 2: Audio Extraction
            try:
                extraction_success = media_service.extract_audio(
                    verified_path, extracted_wav_path
                )
                tracker.end_stage(2, status="COMPLETED" if extraction_success else "FAILED")
            except Exception as e:
                tracker.end_stage(2, status="FAILED")
                raise e

            audio_to_transcribe = (
                extracted_wav_path if extraction_success else verified_path
            )

            whisper_service = WhisperService()
            transcript_repo = TranscriptRepository()

            info_container = {}
            segments = []
            forced_language = (
                meeting.language
                if meeting.language and meeting.language.lower() != "auto"
                else None
            )

            logger.info(
                f"Triggering Whisper transcription. forced_language={forced_language}"
            )
            tracker.start_stage(3)  # Stage 3: Transcription
            try:
                for seg in whisper_service.transcribe_stream(
                    audio_to_transcribe,
                    forced_language=forced_language,
                    info_container=info_container,
                ):
                    segments.append(seg)
                    transcript_repo.save_segment_incremental(
                        db, meeting_id, seg, seg["speaker_tag"]
                    )
                    db.commit()

                duration_seconds = 0
                if segments:
                    duration_seconds = max(0, int(segments[-1]["end_ms"] / 1000))

                detected_lang = info_container.get("language")
                if not forced_language:
                    meeting.language = detected_lang
                else:
                    meeting.language = forced_language

                meeting.duration_seconds = duration_seconds
                meeting.status = "TRANSCRIBED"
                meeting.transcript_status = "COMPLETED"
                db.commit()

                tracker.end_stage(
                    3,
                    status="COMPLETED",
                    metadata={
                        "model": f"faster-whisper-{whisper_service.model_size}",
                        "duration": duration_seconds,
                        "segments": len(segments),
                    },
                )
            except Exception as e:
                tracker.end_stage(3, status="FAILED")
                raise e

            logger.info(
                f"Transcription stage completed successfully for meeting: {meeting_id}"
            )

            # Emit event instead of direct coupling
            from app.events.router import event_router, EventPayload

            event_router.emit(
                "meeting.transcribed",
                EventPayload(meeting_id=meeting_id, event_type="meeting.transcribed"),
            )

        finally:
            if os.path.exists(extracted_wav_path):
                try:
                    os.remove(extracted_wav_path)
                except Exception as cleanup_err:
                    logger.warning(f"Failed to remove temp WAV file: {cleanup_err}")

    except Exception as exc:
        logger.error(
            f"CeleryTask | transcribe_audio | Meeting ID: {meeting_id} | Failed: {exc}"
        )
        db.rollback()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = "FAILED"
            meeting.transcript_status = "FAILED"
            db.commit()
        # Retry logic
        try:
            self.retry(exc=exc)
        except Exception:
            pass
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def speaker_diarization(self, meeting_id: str):
    """
    Asynchronous speaker diarization and speaker mapping task.
    Extracts voice embeddings and updates speakers and segment labels in the database.
    """
    db: Session = SessionLocal()
    from app.utils.logging_pipeline import PipelineTracker
    tracker = PipelineTracker(meeting_id)
    tracker.start_stage(5)  # Stage 5: Speaker Diarization
    try:
        logger.info(
            f"CeleryTask | speaker_diarization | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found.")
            tracker.end_stage(5, status="FAILED")
            return

        meeting.speaker_status = "RUNNING"
        db.commit()

        # Load segments from DB
        transcripts = (
            db.query(Transcript)
            .filter(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.start_time)
            .all()
        )
        if not transcripts:
            logger.warning(
                f"No transcripts found for meeting {meeting_id}. Skipping diarization."
            )
            meeting.speaker_status = "SKIPPED"
            db.commit()
            tracker.end_stage(5, status="SKIPPED")
            # AI analysis is triggered by transcribe_audio; nothing to do here
            return

        segments = []
        for t in transcripts:
            segments.append(
                {
                    "start_ms": int(t.start_time * 1000),
                    "end_ms": int(t.end_time * 1000),
                    "text": t.text,
                    "speaker_tag": t.speaker_tag,
                }
            )

        media_service = MediaService()
        verified_path = media_service.verify_recording_exists(db, meeting_id)
        if not verified_path:
            raise FileNotFoundError(
                f"Recording file not found for diarization: {meeting_id}"
            )

        uploads_dir = media_service.get_uploads_dir()
        extracted_wav_path = os.path.join(
            uploads_dir, f"{meeting_id}_diarize_extracted.wav"
        )

        try:
            extraction_success = media_service.extract_audio(
                verified_path, extracted_wav_path
            )
            audio_to_diarize = (
                extracted_wav_path if extraction_success else verified_path
            )

            diarizer = SpeakerDiarizationService()
            mapper = SpeakerMappingService()

            diarized_segments = diarizer.diarize(audio_to_diarize, segments)
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

            # Finalize transcript in db
            transcript_repo = TranscriptRepository()
            duration_seconds = meeting.duration_seconds
            transcript_repo.finalize_transcript(
                db, meeting_id, diarized_segments, speaker_mapping, duration_seconds
            )

            meeting.speaker_status = "COMPLETED"
            db.commit()

            logger.info(
                f"Speaker diarization stage completed successfully for meeting: {meeting_id}"
            )
            tracker.end_stage(5, status="COMPLETED")

            # Auto-detect speaker names if AI analysis is also done
            try:
                auto_detect_speaker_names(db, meeting_id)
            except Exception as e:
                logger.error(f"Failed to auto-detect speaker names in diarization: {e}")

        finally:
            if os.path.exists(extracted_wav_path):
                try:
                    os.remove(extracted_wav_path)
                except Exception as cleanup_err:
                    logger.warning(f"Failed to remove temp WAV file: {cleanup_err}")

        # AI analysis is triggered independently by transcribe_audio; no duplicate dispatch needed here
        logger.info(
            f"Diarization done. AI analysis task was already dispatched by transcribe_audio."
        )

    except Exception as exc:
        tracker.end_stage(5, status="FAILED")
        logger.error(
            f"CeleryTask | speaker_diarization | Meeting ID: {meeting_id} | Failed: {exc}"
        )
        db.rollback()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.speaker_status = "FAILED"
            db.commit()
        # AI analysis is triggered independently by transcribe_audio; no duplicate dispatch needed here
        try:
            self.retry(exc=exc)
        except Exception:
            pass
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def generate_embeddings(self, meeting_id: str):
    """
    Asynchronous embedding generation task. Generates embeddings for each transcript segment.
    """
    db: Session = SessionLocal()
    from app.utils.logging_pipeline import PipelineTracker
    tracker = PipelineTracker(meeting_id)
    tracker.start_stage(6)  # Stage 6: Embeddings
    try:
        logger.info(
            f"CeleryTask | generate_embeddings | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            tracker.end_stage(6, status="FAILED")
            return

        meeting.embedding_status = "RUNNING"
        meeting.technical_status = "RUNNING"
        db.commit()

        embedding_service = EmbeddingService()
        chunk_count = embedding_service.update_segments_embeddings(db, meeting_id)

        # Run RAG chunking and indexing pipeline
        from app.services.ai.rag_service import RAGService

        RAGService.index_meeting(db, meeting_id)

        logger.info(f"Embedding stage completed successfully for meeting: {meeting_id}")
        meeting.embedding_status = "SUCCESS"
        if meeting.technical_status != "SUCCESS":
            meeting.technical_status = "PENDING"
        db.commit()

        tracker.end_stage(6, status="COMPLETED", metadata={"chunks": chunk_count, "batch_size": 32})

    except Exception as exc:
        tracker.end_stage(6, status="FAILED")
        logger.error(
            f"CeleryTask | generate_embeddings | Meeting ID: {meeting_id} | Failed: {exc}"
        )
        db.rollback()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.embedding_status = "FAILED"
            db.commit()
        try:
            self.retry(exc=exc)
        except Exception:
            pass
    finally:
        db.close()


@celery_app.task(bind=True)
def generate_statistics(self, meeting_id: str):
    """
    Asynchronous statistics calculation task. Recalculates speaker contribution percentages
    based on the database records.
    """
    db: Session = SessionLocal()
    try:
        logger.info(f"CeleryTask | generate_statistics | Meeting ID: {meeting_id}")
        speakers = (
            db.query(MeetingSpeaker)
            .filter(MeetingSpeaker.meeting_id == meeting_id)
            .all()
        )
        transcripts = (
            db.query(Transcript).filter(Transcript.meeting_id == meeting_id).all()
        )

        total_duration = sum((t.end_time - t.start_time) for t in transcripts)
        if total_duration > 0:
            for speaker in speakers:
                speaker_duration = sum(
                    (t.end_time - t.start_time)
                    for t in transcripts
                    if t.speaker_id == speaker.id
                )
                speaker.contribution_percentage = round(
                    (speaker_duration / total_duration) * 100.0, 2
                )
            db.commit()
            logger.info(
                f"CeleryTask | generate_statistics | Successfully updated contribution stats for meeting: {meeting_id}"
            )
    except Exception as e:
        logger.error(
            f"CeleryTask | generate_statistics | Failed for meeting {meeting_id}: {e}"
        )
        db.rollback()
    finally:
        db.close()


@celery_app.task(bind=True)
def generate_cache(self, meeting_id: str):
    """
    Asynchronous cache pre-generation task.
    """
    db: Session = SessionLocal()
    from app.utils.logging_pipeline import PipelineTracker
    tracker = PipelineTracker(meeting_id)
    tracker.start_stage(8)  # Stage 8: Cache
    try:
        logger.info(f"CeleryTask | generate_cache | Meeting ID: {meeting_id}")
        context_str = MeetingContextCache.get_context(meeting_id, db)
        logger.info(
            f"CeleryTask | generate_cache | Successfully populated cache for meeting: {meeting_id}"
        )
        tracker.end_stage(8, status="COMPLETED", metadata={"size_chars": len(context_str)})
    except Exception as e:
        tracker.end_stage(8, status="FAILED")
        logger.error(
            f"CeleryTask | generate_cache | Failed for meeting {meeting_id}: {e}"
        )
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def generate_ai_analysis(self, meeting_id: str):
    """
    Asynchronous AI Analysis stage. Calls Gemini API to extract summaries,
    action items, decisions, risks, etc.
    """
    db: Session = SessionLocal()
    from app.utils.logging_pipeline import PipelineTracker
    tracker = PipelineTracker(meeting_id)
    tracker.start_stage(4)  # Stage 4: AI Summary
    try:
        logger.info(
            f"CeleryTask | generate_ai_analysis | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            tracker.end_stage(4, status="FAILED")
            return

        meeting.ai_status = "RUNNING"
        meeting.executive_summary_status = "RUNNING"
        meeting.action_items_status = "RUNNING"
        meeting.decisions_status = "RUNNING"
        meeting.risks_status = "RUNNING"
        meeting.key_themes_status = "RUNNING"
        meeting.technical_status = "RUNNING"
        db.commit()

        # Build transcript text with speaker names
        transcripts = (
            db.query(Transcript)
            .filter(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.start_time)
            .all()
        )
        if not transcripts:
            logger.warning(
                f"No transcripts found for AI analysis of meeting {meeting_id}."
            )
            meeting.ai_status = "SKIPPED"
            db.commit()
            tracker.end_stage(4, status="SKIPPED")
            from app.events.router import event_router, EventPayload

            event_router.emit(
                "meeting.analyzed",
                EventPayload(meeting_id=meeting_id, event_type="meeting.analyzed"),
            )
            return

        transcript_text = ""
        for t in transcripts:
            speaker_name = (
                t.speaker.display_name if t.speaker else f"Speaker {t.speaker_id}"
            )
            transcript_text += f"{speaker_name}: {t.text}\n"

        gemini_service = GeminiService()
        insights = gemini_service.extract_meeting_insights(transcript_text)

        # Clear old items first
        db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).delete()
        db.query(Decision).filter(Decision.meeting_id == meeting_id).delete()
        db.query(Risk).filter(Risk.meeting_id == meeting_id).delete()
        db.query(Question).filter(Question.meeting_id == meeting_id).delete()

        is_success = isinstance(insights, dict) and len(insights) > 0

        if is_success:
            meeting.executive_summary = insights.get("executive_summary", "")

            extracted_title = insights.get("meeting_title")
            if extracted_title and extracted_title.strip():
                # Only overwrite the meeting title if it is currently empty, null, or a default placeholder
                if (
                    not meeting.title
                    or not meeting.title.strip()
                    or meeting.title.lower().strip()
                    in ("untitled", "untitled meeting", "new meeting", "none", "null")
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

            # Save new fields
            meeting.agenda_items = insights.get("agenda_items", [])
            meeting.technical_context = insights.get("technical_context", {})
            meeting.key_themes = insights.get("key_themes", [])
            meeting.main_takeaways = insights.get("main_takeaways", [])
            meeting.important_quotes = insights.get("important_quotes", [])

            # Followup email
            email_text = f"Hi team,\n\nFollowing up on our session today, here is the summary:\n\n{meeting.executive_summary}\n\nKey Action Items:\n"
            for act in insights.get("action_items", []):
                email_text += f"- {act.get('description', '')} ({act.get('assigned_to', 'Unassigned')})\n"
            email_text += "\nBest regards,\nMeetingMind AI"
            meeting.followup_email = email_text

            # Insert Action Items
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

            # Insert Questions
            for q in insights.get("questions", []):
                q_text = q.strip() if isinstance(q, str) else ""
                if not q_text or q_text.lower() == "not discussed":
                    continue
                question = Question(meeting_id=meeting_id, question_text=q_text)
                db.add(question)

            logger.info(f"AI saved | Meeting ID: {meeting_id}")
            db.commit()
            logger.info(f"Database committed | Meeting ID: {meeting_id}")

            meeting.ai_status = "SUCCESS"
            meeting.executive_summary_status = "COMPLETED"
            meeting.action_items_status = "COMPLETED"
            meeting.decisions_status = "COMPLETED"
            meeting.risks_status = "COMPLETED"
            meeting.key_themes_status = "COMPLETED"
            meeting.technical_status = "COMPLETED"
            db.commit()
            logger.info(
                f"Meeting updated | Meeting ID: {meeting_id} | ai_status: {meeting.ai_status}"
            )

            tracker.end_stage(
                4,
                status="COMPLETED",
                metadata={
                    "provider": gemini_service.current_provider.title() if hasattr(gemini_service, "current_provider") else "Gemini",
                    "model": gemini_service.model_name if hasattr(gemini_service, "model_name") else "gemini-1.5-flash",
                    "prompt_tokens": gemini_service.last_prompt_tokens if hasattr(gemini_service, "last_prompt_tokens") else 0,
                    "completion_tokens": gemini_service.last_completion_tokens if hasattr(gemini_service, "last_completion_tokens") else 0,
                },
            )

            # Auto-detect speaker names if diarization is also done
            try:
                auto_detect_speaker_names(db, meeting_id)
            except Exception as e:
                logger.error(f"Failed to auto-detect speaker names in AI analysis: {e}")
        else:
            meeting.ai_status = "FAILED"
            meeting.executive_summary_status = "FAILED"
            meeting.action_items_status = "FAILED"
            meeting.decisions_status = "FAILED"
            meeting.risks_status = "FAILED"
            meeting.key_themes_status = "FAILED"
            meeting.executive_summary = "AI analysis unavailable."
            db.commit()
            logger.info(
                f"Meeting updated | Meeting ID: {meeting_id} | ai_status: {meeting.ai_status} (FAILED)"
            )
            tracker.end_stage(4, status="FAILED")

        # Trigger Knowledge Graph stage
        from app.events.router import event_router, EventPayload

        event_router.emit(
            "meeting.analyzed",
            EventPayload(meeting_id=meeting_id, event_type="meeting.analyzed"),
        )

    except Exception as exc:
        tracker.end_stage(4, status="FAILED")
        logger.error(
            f"CeleryTask | generate_ai_analysis | Meeting ID: {meeting_id} | Failed: {exc}"
        )
        db.rollback()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.ai_status = "FAILED"
            meeting.executive_summary_status = "FAILED"
            meeting.action_items_status = "FAILED"
            meeting.decisions_status = "FAILED"
            meeting.risks_status = "FAILED"
            meeting.key_themes_status = "FAILED"
            meeting.executive_summary = "AI analysis unavailable."
            db.commit()
            logger.info(
                f"Meeting updated | Meeting ID: {meeting_id} | ai_status: {meeting.ai_status} (EXCEPTION)"
            )
        # Trigger Knowledge Graph anyway
        from app.events.router import event_router, EventPayload

        event_router.emit(
            "meeting.analyzed",
            EventPayload(meeting_id=meeting_id, event_type="meeting.analyzed"),
        )
        try:
            self.retry(exc=exc)
        except Exception:
            pass
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def generate_knowledge_graph(self, meeting_id: str):
    """
    Asynchronous Knowledge Graph resolution task.
    """
    db: Session = SessionLocal()
    from app.utils.logging_pipeline import PipelineTracker
    tracker = PipelineTracker(meeting_id)
    tracker.start_stage(7)  # Stage 7: Knowledge Graph
    try:
        logger.info(
            f"CeleryTask | generate_knowledge_graph | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            tracker.end_stage(7, status="FAILED")
            return

        meeting.kg_status = "RUNNING"
        meeting.technical_status = "RUNNING"
        db.commit()

        kg_service = KnowledgeGraphService()
        technical_context = meeting.technical_context
        # Fallback or reuse knowledge graph insights if available
        knowledge_graph = None

        kg_service.update_knowledge_graph(
            db, meeting_id, technical_context, knowledge_graph
        )

        meeting.kg_status = "SUCCESS"
        meeting.status = "COMPLETED"
        meeting.technical_status = "COMPLETED"
        db.commit()

        # Query counts
        node_count = db.query(KnowledgeGraphNode).filter(KnowledgeGraphNode.organization_id == meeting.organization_id).count()
        edge_count = db.query(KnowledgeGraphEdge).filter(KnowledgeGraphEdge.organization_id == meeting.organization_id).count()

        logger.info(
            f"Knowledge Graph stage completed successfully for meeting: {meeting_id}"
        )
        tracker.end_stage(7, status="COMPLETED", metadata={"nodes": node_count, "edges": edge_count})

    except Exception as exc:
        tracker.end_stage(7, status="FAILED")
        logger.error(
            f"CeleryTask | generate_knowledge_graph | Meeting ID: {meeting_id} | Failed: {exc}"
        )
        db.rollback()
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.kg_status = "FAILED"
            meeting.status = "COMPLETED"  # Mark completed so overall pipeline is done
            meeting.technical_status = "FAILED"
            db.commit()
        try:
            self.retry(exc=exc)
        except Exception:
            pass
    finally:
        db.close()


@celery_app.task(bind=True)
def join_scheduled_meeting(self, scheduled_meeting_id: str):
    """
    Phase 3b: Bot join orchestration for link-based meetings.
    """
    db: Session = SessionLocal()
    try:
        scheduled = (
            db.query(ScheduledMeeting)
            .filter(ScheduledMeeting.id == scheduled_meeting_id)
            .first()
        )
        if not scheduled:
            logger.error(
                f"CeleryTask | join_scheduled_meeting | Scheduled meeting {scheduled_meeting_id} not found."
            )
            return

        meeting = db.query(Meeting).filter(Meeting.id == scheduled.meeting_id).first()
        if not meeting:
            logger.error(
                f"CeleryTask | join_scheduled_meeting | Parent meeting for scheduled meeting {scheduled_meeting_id} not found."
            )
            scheduled.status = "Failed"
            db.commit()
            return

        scheduled.status = "Joined"
        meeting.status = "PROCESSING"
        meeting.transcript_status = "PENDING"
        meeting.speaker_status = "PENDING"
        meeting.embedding_status = "PENDING"
        meeting.ai_status = "PENDING"
        meeting.kg_status = "PENDING"

        session = (
            db.query(AgentLiveSession)
            .filter(AgentLiveSession.scheduled_meeting_id == scheduled.id)
            .first()
        )
        if session:
            session.status = "Live"
        db.commit()

        platform = _normalize_platform(scheduled.platform)
        logger.info(
            f"CeleryTask | join_scheduled_meeting | Bot joining {platform}: {scheduled.meeting_url}"
        )

        if platform == "Teams":
            from app.agent.connectors.teams import TeamsConnector

            TeamsConnector().join_meeting(scheduled.meeting_url)
        elif platform == "Google Meet":
            from app.agent.connectors.meet import GoogleMeetConnector

            GoogleMeetConnector().join_meeting(scheduled.meeting_url)
        elif platform == "Zoom":
            from app.agent.connectors.zoom import ZoomConnector

            ZoomConnector().join_meeting(scheduled.meeting_url)
        else:
            logger.warning(
                f"CeleryTask | join_scheduled_meeting | Unsupported platform for auto-join: {scheduled.platform}"
            )
            scheduled.status = "Failed"
            meeting.status = "FAILED"
            if session:
                session.status = "Error"
            db.commit()
            return

        # Check if a real media file is available for the meeting before queuing Celery.
        media_service = MediaService()
        recording_path = media_service.verify_recording_exists(db, meeting.id)
        if recording_path:
            from app.services.pipeline.pipeline_manager import PipelineManager

            PipelineManager.trigger_pipeline(db, meeting.id, recording_path)
        else:
            logger.warning(
                f"CeleryTask | join_scheduled_meeting | Bot joined, but no media recording found for meeting {meeting.id}. Not transcribing."
            )
            meeting.status = "FAILED"
            db.commit()

    except Exception as e:
        logger.error(
            f"CeleryTask | join_scheduled_meeting | Scheduled join failed: {e}"
        )
        db.rollback()
        scheduled = (
            db.query(ScheduledMeeting)
            .filter(ScheduledMeeting.id == scheduled_meeting_id)
            .first()
        )
        if scheduled:
            scheduled.status = "Failed"
        db.commit()
    finally:
        db.close()


def auto_detect_speaker_names(db: Session, meeting_id: str):
    """
    Checks if both speaker_diarization and generate_ai_analysis are completed.
    If yes, runs LLM speaker name detection to map generic 'Speaker X' names to real names
    based on transcript context, and updates the database.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return

    # Check if both diarization and AI analysis have run successfully
    if meeting.speaker_status != "COMPLETED" or meeting.ai_status != "SUCCESS":
        logger.info(
            f"auto_detect_speaker_names | Skipping because stages not completed. "
            f"speaker_status={meeting.speaker_status}, ai_status={meeting.ai_status}"
        )
        return

    logger.info(
        f"auto_detect_speaker_names | Running speaker name identification for meeting {meeting_id}"
    )

    # Get all unconfirmed speakers with generic-looking names
    unconfirmed_speakers = (
        db.query(MeetingSpeaker)
        .filter(
            MeetingSpeaker.meeting_id == meeting_id,
            MeetingSpeaker.is_confirmed == False,
        )
        .all()
    )

    if not unconfirmed_speakers:
        logger.info(
            "auto_detect_speaker_names | No unconfirmed speakers found. Skipping."
        )
        return

    # Check if they have generic names (e.g. starting with "speaker")
    generic_speakers = []
    for spk in unconfirmed_speakers:
        if spk.display_name.lower().startswith("speaker"):
            generic_speakers.append(spk)

    if not generic_speakers:
        logger.info(
            "auto_detect_speaker_names | No generic unconfirmed speakers found. Skipping."
        )
        return

    # Load transcripts to build text
    transcripts = (
        db.query(Transcript)
        .filter(Transcript.meeting_id == meeting_id)
        .order_by(Transcript.start_time)
        .all()
    )
    if not transcripts:
        return

    # Format transcript text with speaker labels
    transcript_lines = []
    for t in transcripts:
        name = t.speaker.display_name if t.speaker else f"Speaker {t.speaker_id}"
        transcript_lines.append(f"{name}: {t.text}")
    transcript_text = "\n".join(transcript_lines)

    # Get known organization users to match against
    org_users = (
        db.query(User).filter(User.organization_id == meeting.organization_id).all()
    )
    known_members = [u.name for u in org_users if u.name]

    # Map current generic names
    current_generic_names = [spk.display_name for spk in generic_speakers]

    gemini_service = GeminiService()
    detected_mapping = gemini_service.identify_speaker_names(
        transcript_text, current_generic_names, known_members
    )

    if not detected_mapping:
        logger.info("auto_detect_speaker_names | No speaker names detected by LLM.")
        return

    logger.info(f"auto_detect_speaker_names | LLM detected mapping: {detected_mapping}")

    updated = False
    for spk in generic_speakers:
        detected_name = detected_mapping.get(spk.display_name)
        if detected_name:
            logger.info(
                f"auto_detect_speaker_names | Mapping '{spk.display_name}' to '{detected_name}'"
            )
            spk.display_name = detected_name
            spk.is_confirmed = True
            updated = True

    if updated:
        db.commit()
        # Invalidate cache so the frontend gets the fresh names
        MeetingContextCache.invalidate(meeting_id)
        logger.info(
            "auto_detect_speaker_names | Database updated and cache invalidated."
        )


@celery_app.task
def send_mom_email(meeting_id: str):
    """
    Celery task to generate and distribute the Minutes of Meeting (MOM)
    email once the entire pipeline has finished.
    """
    logger.info(f"send_mom_email task started for meeting: {meeting_id}")
    db = SessionLocal()
    try:
        from app.services.email_service import EmailService
        EmailService.send_mom_email(db, meeting_id)
    except Exception as e:
        logger.error(f"send_mom_email task failed: {e}")
    finally:
        db.close()

