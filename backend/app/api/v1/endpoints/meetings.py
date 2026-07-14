import uuid
import logging
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database.connection import get_db
from app.models.models import (
    Meeting,
    User,
    Transcript,
    ActionItem,
    Decision,
    Risk,
    Question,
    MeetingSpeaker,
    ScheduledMeeting,
    AgentLiveSession,
)
from app.helpers.auth import get_current_user
from app.models.enums import MeetingStatus, AIStatus, Platform
from app.schemas.meetings import (
    MeetingCreate,
    SpeakerOut,
    TranscriptSegmentOut,
    ActionItemOut,
    DecisionOut,
    RiskOut,
    QuestionOut,
    MeetingListOut,
    MeetingDetailOut,
    JoinMeetingLinkRequest,
    RenameSpeakerRequest,
)
from app.services.media_service import MediaService
from app.services.cache_service import MeetingContextCache

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[MeetingListOut])
def get_meetings(
    include_future: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Automatically clean up stuck meetings (older than 15 minutes in non-terminal states)
    try:
        stale_threshold = datetime.utcnow() - timedelta(minutes=15)
        stuck_meetings = (
            db.query(Meeting)
            .filter(
                Meeting.organization_id == current_user.organization_id,
                Meeting.created_at < stale_threshold,
                # Either it's actively processing/transcribing/analyzing OR it's uploaded and has a recording file
                (
                    Meeting.status.in_(MeetingStatus.processing_values())
                    | (
                        Meeting.status.in_(MeetingStatus.uploaded_values())
                        & Meeting.recording_url.isnot(None)
                    )
                ),
            )
            .all()
        )
        if stuck_meetings:
            for m in stuck_meetings:
                m.status = MeetingStatus.FAILED.value
                if m.ai_status in AIStatus.active_values():
                    m.ai_status = AIStatus.FAILED.value
                if m.embedding_status in AIStatus.active_values():
                    m.embedding_status = AIStatus.FAILED.value
                if m.speaker_status in AIStatus.active_values():
                    m.speaker_status = AIStatus.FAILED.value
                if m.kg_status in AIStatus.active_values():
                    m.kg_status = AIStatus.FAILED.value
            db.commit()
    except Exception as e:
        logger.error(f"Error cleaning up stuck meetings: {e}")
        db.rollback()

    query = db.query(Meeting).filter(
        Meeting.organization_id == current_user.organization_id
    )
    if not include_future:
        now = datetime.utcnow()
        # Exclude meetings that are scheduled for the future and have not started (no recording and UPLOADED)
        query = query.filter(
            (Meeting.meeting_date <= now)
            | (Meeting.status.notin_(MeetingStatus.uploaded_values()))
            | (Meeting.recording_url.isnot(None))
        )

    meetings = query.order_by(Meeting.meeting_date.desc()).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingDetailOut)
def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Automatically clean up if stuck
    try:
        stale_threshold = datetime.utcnow() - timedelta(minutes=15)
        is_stuck_processing = meeting.status in MeetingStatus.processing_values() or (
            meeting.status in MeetingStatus.uploaded_values()
            and meeting.recording_url is not None
        )
        if is_stuck_processing and meeting.created_at < stale_threshold:
            meeting.status = MeetingStatus.FAILED.value
            if meeting.ai_status in AIStatus.active_values():
                meeting.ai_status = AIStatus.FAILED.value
            if meeting.embedding_status in AIStatus.active_values():
                meeting.embedding_status = AIStatus.FAILED.value
            if meeting.speaker_status in AIStatus.active_values():
                meeting.speaker_status = AIStatus.FAILED.value
            if meeting.kg_status in AIStatus.active_values():
                meeting.kg_status = AIStatus.FAILED.value
            db.commit()
            db.refresh(meeting)
    except Exception as e:
        logger.error(f"Error cleaning up single stuck meeting: {e}")
        db.rollback()

    logger.info(f"Frontend response sent | Meeting ID: {meeting_id}")
    return meeting


@router.post(
    "/upload", response_model=MeetingListOut, status_code=status.HTTP_202_ACCEPTED
)
def upload_meeting(
    title: str = Form(...),
    meeting_date: Optional[str] = Form(None),
    platform: Optional[str] = Form("Upload"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parsed_date = datetime.utcnow()
    if meeting_date:
        try:
            parsed_date = datetime.fromisoformat(meeting_date)
        except ValueError:
            pass

    meeting = Meeting(
        title=title,
        meeting_date=parsed_date,
        organization_id=current_user.organization_id,
        status=MeetingStatus.UPLOADED.value,
        ai_status=AIStatus.PENDING.value,
        embedding_status=AIStatus.PENDING.value,
        platform=platform,
        recording_url=None,
        meeting_url=None,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    media_service = MediaService()
    try:
        saved_file_path = media_service.save_uploaded_file(file, meeting, db)
    except Exception as save_err:
        meeting.status = MeetingStatus.FAILED.value
        db.commit()
        raise HTTPException(
            status_code=500, detail=f"Failed to save uploaded file: {save_err}"
        )
    try:
        from app.services.pipeline.pipeline_manager import PipelineManager

        PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
    except Exception as e:
        print(f"Failed to queue Celery processing: {e}")

    return meeting


@router.post(
    "/join-link", response_model=MeetingListOut, status_code=status.HTTP_202_ACCEPTED
)
def join_meeting_by_link(
    request: JoinMeetingLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parsed_date = request.meeting_date or datetime.utcnow()
    scheduled_start = request.scheduled_start or parsed_date
    scheduled_end = request.scheduled_end or (scheduled_start + timedelta(minutes=30))

    meeting = Meeting(
        title=request.title,
        meeting_date=parsed_date,
        organization_id=current_user.organization_id,
        status=MeetingStatus.UPLOADED.value,
        ai_status=AIStatus.PENDING.value,
        embedding_status=AIStatus.PENDING.value,
        platform=request.platform,
        recording_url=None,
        meeting_url=request.meeting_url,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    scheduled_meeting = ScheduledMeeting(
        organization_id=current_user.organization_id,
        meeting_url=request.meeting_url,
        title=request.title,
        platform=request.platform,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
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

        join_scheduled_meeting.apply_async(
            args=[scheduled_meeting.id], eta=scheduled_start
        )
    except Exception as e:
        print(f"Failed to start live agent: {e}")

    return meeting


@router.post("/{meeting_id}/upload-media", response_model=MeetingDetailOut)
def upload_meeting_media(
    meeting_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = MeetingStatus.PROCESSING.value
    db.commit()
    MeetingContextCache.invalidate(meeting_id)

    media_service = MediaService()
    try:
        saved_file_path = media_service.save_uploaded_file(file, meeting, db)
    except Exception as save_err:
        meeting.status = MeetingStatus.FAILED.value
        db.commit()
        raise HTTPException(
            status_code=500, detail=f"Failed to save uploaded file: {save_err}"
        )
    try:
        from app.services.pipeline.pipeline_manager import PipelineManager

        PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
    except Exception as e:
        print(f"Failed to queue Celery processing: {e}")

    return meeting


@router.post("/{meeting_id}/transcribe", response_model=MeetingDetailOut)
def transcribe_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )

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
        from app.services.pipeline.pipeline_manager import PipelineManager

        PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
    except Exception as e:
        print(f"Failed to queue Celery processing: {e}")

    return meeting


@router.put("/{meeting_id}/speakers/{speaker_id}", response_model=MeetingDetailOut)
def rename_speaker(
    meeting_id: str,
    speaker_id: str,
    request: RenameSpeakerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    speaker = (
        db.query(MeetingSpeaker)
        .filter(
            MeetingSpeaker.id == speaker_id,
            MeetingSpeaker.meeting_id == meeting_id,
        )
        .first()
    )
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    # Rename
    speaker.display_name = request.display_name
    speaker.is_confirmed = True

    db.commit()
    db.refresh(meeting)

    # Invalidate RAG and detail cache
    MeetingContextCache.invalidate(meeting_id)

    return meeting


@router.post("/{meeting_id}/retry", response_model=MeetingDetailOut)
def retry_meeting_stage(
    meeting_id: str,
    stage: str,  # "transcription", "diarization", "embedding", "analysis", "knowledge_graph"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    from app.services.pipeline.pipeline_manager import PipelineManager

    success = PipelineManager.retry_stage(db, meeting_id, stage)
    if not success:
        raise HTTPException(status_code=400, detail=f"Failed to retry stage: {stage}")

    db.refresh(meeting)
    return meeting
