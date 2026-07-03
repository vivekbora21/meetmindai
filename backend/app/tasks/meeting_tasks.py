import logging
from sqlalchemy.orm import Session
from app.celery_app import celery_app
from app.database.connection import SessionLocal
from app.models.models import Meeting, ScheduledMeeting, AgentLiveSession
from app.services.meeting_pipeline import MeetingPipeline
from app.services.media_service import MediaService

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


@celery_app.task(bind=True)
def process_meeting_audio(self, meeting_id: str, file_name: str):
    """
    Phase 4 Pipeline: Speech-to-Text & Diarization
    Extracts audio via FFmpeg, runs faster-whisper, and populates database.
    """
    db: Session = SessionLocal()
    try:
        logger.info(
            f"CeleryTask | process_meeting_audio | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        pipeline = MeetingPipeline()
        # Run transcription stage (verify media, extract, transcribe, save transcript)
        pipeline.run_transcription_stage(db, meeting_id, file_name, self.request.id)

        # If successful, queue AI analysis
        analyze_transcript_ai.delay(meeting_id)
    except Exception as e:
        logger.error(
            f"CeleryTask | process_meeting_audio | Meeting ID: {meeting_id} | Failed: {e}"
        )
    finally:
        db.close()


@celery_app.task(bind=True)
def analyze_transcript_ai(self, meeting_id: str):
    """
    Phase 5 Pipeline: AI Agent summary extraction (using OpenRouter)
    """
    db: Session = SessionLocal()
    try:
        logger.info(
            f"CeleryTask | analyze_transcript_ai | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        pipeline = MeetingPipeline()
        # Run AI analysis stage (extract insights, save summaries and items, update AI status)
        insights = pipeline.run_ai_analysis_stage(db, meeting_id, self.request.id)

        # Proceed with generating embeddings
        generate_embeddings.delay(meeting_id, insights)
    except Exception as e:
        logger.error(
            f"CeleryTask | analyze_transcript_ai | Meeting ID: {meeting_id} | Failed: {e}"
        )
    finally:
        db.close()


@celery_app.task(bind=True)
def generate_embeddings(self, meeting_id: str, insights: dict = None):
    """
    Phase 6 Pipeline: pgvector RAG Embedding seeding using nomic embedding model
    """
    db: Session = SessionLocal()
    try:
        logger.info(
            f"CeleryTask | generate_embeddings | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        pipeline = MeetingPipeline()
        # Run embeddings stage
        pipeline.run_embeddings_stage(db, meeting_id, self.request.id)

        # Proceed with updating knowledge graph
        update_knowledge_graph.delay(meeting_id, insights)
    except Exception as e:
        logger.error(
            f"CeleryTask | generate_embeddings | Meeting ID: {meeting_id} | Failed: {e}"
        )
    finally:
        db.close()


@celery_app.task(bind=True)
def update_knowledge_graph(self, meeting_id: str, insights: dict = None):
    """
    Phase 7 Pipeline: Knowledge Graph Link Resolutions
    """
    db: Session = SessionLocal()
    try:
        logger.info(
            f"CeleryTask | update_knowledge_graph | Meeting ID: {meeting_id} | Task ID: {self.request.id}"
        )
        pipeline = MeetingPipeline()
        technical_context = insights.get("technical_context") if insights else None
        # Run Knowledge Graph stage
        pipeline.run_knowledge_graph_stage(
            db, meeting_id, self.request.id, technical_context
        )
    except Exception as e:
        logger.error(
            f"CeleryTask | update_knowledge_graph | Meeting ID: {meeting_id} | Failed: {e}"
        )
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
        # Since this is a simulated connector, we check if the recording file exists on disk.
        media_service = MediaService()
        recording_path = media_service.verify_recording_exists(db, meeting.id)
        if recording_path:
            process_meeting_audio.delay(meeting.id, recording_path)
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
