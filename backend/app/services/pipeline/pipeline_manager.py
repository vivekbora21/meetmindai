import logging
from sqlalchemy.orm import Session
from app.models.models import Meeting

logger = logging.getLogger(__name__)


class PipelineManager:
    @staticmethod
    def trigger_pipeline(db: Session, meeting_id: str, file_path: str) -> None:
        """
        Starts the asynchronous meeting processing pipeline.
        Resets all statuses and kicks off the transcribe_audio Celery task.
        """
        from app.tasks.meeting_tasks import transcribe_audio
        from app.utils.logging_pipeline import PipelineTracker

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"PipelineManager | Meeting {meeting_id} not found.")
            return

        # Ensure pipeline tracker is initialized
        tracker = PipelineTracker(meeting_id)
        if not tracker.redis_client.hexists(tracker.redis_key, "start_time"):
            tracker.start_pipeline()
            tracker.start_stage(1)
            tracker.end_stage(1, status="SKIPPED")
        else:
            upload_status = tracker.redis_client.hget(tracker.redis_key, "upload_status")
            if upload_status == b"PENDING" or upload_status == "PENDING":
                tracker.start_stage(1)
                tracker.end_stage(1, status="SKIPPED")

        meeting.status = "PROCESSING"
        meeting.transcript_status = "PENDING"
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

        logger.info(
            f"PipelineManager | Triggering transcription task for meeting: {meeting_id}"
        )
        transcribe_audio.delay(meeting_id, file_path)

    @staticmethod
    def get_progress(db: Session, meeting_id: str) -> dict:
        """
        Retrieves the progress of the processing pipeline stages.
        """
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return {}

        return {
            "status": meeting.status,
            "transcript_status": meeting.transcript_status,
            "speaker_status": meeting.speaker_status,
            "embedding_status": meeting.embedding_status,
            "ai_status": meeting.ai_status,
            "kg_status": meeting.kg_status,
            "executive_summary_status": meeting.executive_summary_status,
            "action_items_status": meeting.action_items_status,
            "decisions_status": meeting.decisions_status,
            "risks_status": meeting.risks_status,
            "technical_status": meeting.technical_status,
            "key_themes_status": meeting.key_themes_status,
        }

    @staticmethod
    def retry_stage(db: Session, meeting_id: str, stage: str) -> bool:
        """
        Retries a failed stage in the meeting processing pipeline.
        """
        from app.tasks.meeting_tasks import (
            transcribe_audio,
            speaker_diarization,
            generate_embeddings,
            generate_ai_analysis,
            generate_knowledge_graph,
        )

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"PipelineManager | Meeting {meeting_id} not found.")
            return False

        logger.info(
            f"PipelineManager | Retrying stage '{stage}' for meeting {meeting_id}"
        )

        if stage == "transcription":
            # For transcription, we need the original or uploaded file path
            file_path = meeting.recording_url
            if not file_path:
                logger.error(
                    f"PipelineManager | Cannot retry transcription: recording_url is missing."
                )
                return False
            meeting.status = "PROCESSING"
            meeting.transcript_status = "PENDING"
            db.commit()
            transcribe_audio.delay(meeting_id, file_path)
            return True

        elif stage == "diarization":
            meeting.speaker_status = "PENDING"
            db.commit()
            speaker_diarization.delay(meeting_id)
            return True

        elif stage == "embedding":
            meeting.embedding_status = "PENDING"
            db.commit()
            generate_embeddings.delay(meeting_id)
            return True

        elif stage in ("analysis", "ai_analysis"):
            meeting.ai_status = "PENDING"
            db.commit()
            generate_ai_analysis.delay(meeting_id)
            return True

        elif stage == "knowledge_graph":
            meeting.kg_status = "PENDING"
            db.commit()
            generate_knowledge_graph.delay(meeting_id)
            return True

        logger.error(f"PipelineManager | Unknown stage: {stage}")
        return False
