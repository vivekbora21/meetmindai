from typing import Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.models import User, Meeting, ScheduledMeeting, AgentLiveSession, MeetingSpeaker
from app.models.enums import MeetingStatus, AIStatus
from app.repositories.meeting_repository import meeting_repository
from app.services.media_service import MediaService
from app.services.cache_service import MeetingContextCache
from app.services.pipeline.pipeline_manager import PipelineManager

class MeetingService:
    def create_from_upload(
        self, db: Session, current_user: User, title: str, meeting_date: Optional[str], platform: str, file: UploadFile
    ) -> Meeting:
        parsed_date = datetime.utcnow()
        if meeting_date:
            try:
                parsed_date = datetime.fromisoformat(meeting_date)
            except ValueError:
                pass

        meeting = meeting_repository.create(
            db,
            obj_in={
                "title": title,
                "meeting_date": parsed_date,
                "organization_id": current_user.organization_id,
                "status": MeetingStatus.UPLOADED.value,
                "ai_status": AIStatus.PENDING.value,
                "embedding_status": AIStatus.PENDING.value,
                "transcript_status": AIStatus.PENDING.value,
                "executive_summary_status": AIStatus.PENDING.value,
                "action_items_status": AIStatus.PENDING.value,
                "decisions_status": AIStatus.PENDING.value,
                "risks_status": AIStatus.PENDING.value,
                "technical_status": AIStatus.PENDING.value,
                "key_themes_status": AIStatus.PENDING.value,
                "platform": platform,
            }
        )

        from app.utils.logging_pipeline import PipelineTracker
        tracker = PipelineTracker(meeting.id)
        tracker.start_pipeline()
        tracker.start_stage(1)  # Stage 1: Upload

        media_service = MediaService()
        try:
            saved_file_path = media_service.save_uploaded_file(file, meeting, db)
            tracker.end_stage(1, status="COMPLETED")
        except Exception as save_err:
            tracker.end_stage(1, status="FAILED")
            meeting.status = MeetingStatus.FAILED.value
            db.commit()
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {save_err}")

        try:
            PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
        except Exception as e:
            print(f"Failed to queue Celery processing: {e}")

        return meeting

    def create_from_link(
        self, db: Session, current_user: User, title: str, meeting_url: str, platform: str, 
        meeting_date: Optional[datetime], scheduled_start: Optional[datetime], scheduled_end: Optional[datetime]
    ) -> Meeting:
        parsed_date = meeting_date or datetime.utcnow()
        start = scheduled_start or parsed_date
        end = scheduled_end or (start + timedelta(minutes=30))

        meeting = meeting_repository.create(
            db,
            obj_in={
                "title": title,
                "meeting_date": parsed_date,
                "organization_id": current_user.organization_id,
                "status": MeetingStatus.UPLOADED.value,
                "ai_status": AIStatus.PENDING.value,
                "embedding_status": AIStatus.PENDING.value,
                "transcript_status": AIStatus.PENDING.value,
                "executive_summary_status": AIStatus.PENDING.value,
                "action_items_status": AIStatus.PENDING.value,
                "decisions_status": AIStatus.PENDING.value,
                "risks_status": AIStatus.PENDING.value,
                "technical_status": AIStatus.PENDING.value,
                "key_themes_status": AIStatus.PENDING.value,
                "platform": platform,
                "meeting_url": meeting_url,
            }
        )

        scheduled_meeting = ScheduledMeeting(
            organization_id=current_user.organization_id,
            meeting_url=meeting_url,
            title=title,
            platform=platform,
            scheduled_start=start,
            scheduled_end=end,
            status="Scheduled",
            meeting_id=meeting.id,
        )
        db.add(scheduled_meeting)
        db.commit()
        db.refresh(scheduled_meeting)

        session = AgentLiveSession(
            meeting_id=meeting.id,
            scheduled_meeting_id=scheduled_meeting.id,
            status="Connecting",
        )
        db.add(session)
        db.commit()

        try:
            from app.tasks.meeting_tasks import join_scheduled_meeting
            join_scheduled_meeting.apply_async(args=[scheduled_meeting.id], eta=start)
        except Exception as e:
            print(f"Failed to start live agent: {e}")

        return meeting

    def upload_media(self, db: Session, current_user: User, meeting_id: str, file: UploadFile) -> Meeting:
        meeting = meeting_repository.get(db, meeting_id, current_user.organization_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        meeting.status = MeetingStatus.PROCESSING.value
        db.commit()
        MeetingContextCache.invalidate(meeting_id)

        from app.utils.logging_pipeline import PipelineTracker
        tracker = PipelineTracker(meeting.id)
        tracker.start_pipeline()
        tracker.start_stage(1)  # Stage 1: Upload

        media_service = MediaService()
        try:
            saved_file_path = media_service.save_uploaded_file(file, meeting, db)
            tracker.end_stage(1, status="COMPLETED")
        except Exception as save_err:
            tracker.end_stage(1, status="FAILED")
            meeting.status = MeetingStatus.FAILED.value
            db.commit()
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {save_err}")
            
        try:
            PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
        except Exception as e:
            print(f"Failed to queue Celery processing: {e}")

        return meeting

    def transcribe_meeting(self, db: Session, current_user: User, meeting_id: str) -> Meeting:
        meeting = meeting_repository.get(db, meeting_id, current_user.organization_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        media_service = MediaService()
        saved_file_path = media_service.verify_recording_exists(db, meeting_id)
        if not saved_file_path:
            raise HTTPException(status_code=404, detail="Meeting recording not found.")

        meeting.status = MeetingStatus.PROCESSING.value
        db.commit()
        MeetingContextCache.invalidate(meeting_id)
        
        try:
            PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
        except Exception as e:
            print(f"Failed to queue Celery processing: {e}")

        return meeting

    def rename_speaker(self, db: Session, current_user: User, meeting_id: str, speaker_id: str, display_name: str) -> Meeting:
        meeting = meeting_repository.get(db, meeting_id, current_user.organization_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        speaker = db.query(MeetingSpeaker).filter(
            MeetingSpeaker.id == speaker_id,
            MeetingSpeaker.meeting_id == meeting_id,
        ).first()
        
        if not speaker:
            raise HTTPException(status_code=404, detail="Speaker not found")

        speaker.display_name = display_name
        speaker.is_confirmed = True

        db.commit()
        db.refresh(meeting)
        MeetingContextCache.invalidate(meeting_id)

        return meeting

    def retry_stage(self, db: Session, current_user: User, meeting_id: str, stage: str) -> Meeting:
        meeting = meeting_repository.get(db, meeting_id, current_user.organization_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        success = PipelineManager.retry_stage(db, meeting_id, stage)
        if not success:
            raise HTTPException(status_code=400, detail=f"Failed to retry stage: {stage}")

        db.refresh(meeting)
        return meeting

meeting_service = MeetingService()
