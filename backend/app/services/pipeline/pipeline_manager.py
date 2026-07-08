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

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"PipelineManager | Meeting {meeting_id} not found.")
            return

        meeting.status = "PROCESSING"
        meeting.speaker_status = "PENDING"
        meeting.embedding_status = "PENDING"
        meeting.ai_status = "PENDING"
        meeting.kg_status = "PENDING"
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
            "speaker_status": meeting.speaker_status,
            "embedding_status": meeting.embedding_status,
            "ai_status": meeting.ai_status,
            "kg_status": meeting.kg_status,
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
