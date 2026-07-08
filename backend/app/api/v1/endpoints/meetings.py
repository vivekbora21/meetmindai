import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
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
from app.api.v1.endpoints.auth import get_current_user
from app.services.media_service import MediaService
from app.services.cache_service import MeetingContextCache

router = APIRouter()


# Schemas
class MeetingCreate(BaseModel):
    title: str
    meeting_date: Optional[datetime] = None


class SpeakerOut(BaseModel):
    id: str
    speaker_number: int
    speaker_tag: str
    display_name: str
    is_confirmed: bool
    confidence: Optional[float] = None
    contribution_percentage: Optional[float] = None
    has_conflict: Optional[bool] = False
    conflict_details: Optional[str] = None

    class Config:
        from_attributes = True


class TranscriptSegmentOut(BaseModel):
    id: str
    speaker_id: Optional[str] = None
    speaker_tag: str
    start_time: float
    end_time: float
    start_ms: int
    end_ms: int
    text: str

    class Config:
        from_attributes = True


class ActionItemOut(BaseModel):
    id: str
    description: str
    status: str
    priority: str
    due_date: Optional[datetime]
    assigned_to: Optional[str]
    confidence_score: float

    class Config:
        from_attributes = True


class DecisionOut(BaseModel):
    id: str
    decision_text: str
    rationale: Optional[str]
    confidence_score: float

    class Config:
        from_attributes = True


class RiskOut(BaseModel):
    id: str
    risk_text: str
    mitigation: Optional[str]
    severity: str

    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: str
    question_text: str

    class Config:
        from_attributes = True


class MeetingListOut(BaseModel):
    id: str
    title: str
    status: str
    ai_status: str
    embedding_status: str
    speaker_status: Optional[str] = None
    kg_status: Optional[str] = None
    platform: str
    duration_seconds: int
    meeting_date: datetime
    created_at: datetime
    meeting_url: Optional[str] = None
    recording_url: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    content_type: Optional[str] = None

    class Config:
        from_attributes = True


class MeetingDetailOut(BaseModel):
    id: str
    title: str
    status: str
    ai_status: str
    embedding_status: str
    speaker_status: Optional[str] = None
    kg_status: Optional[str] = None
    platform: str
    recording_url: Optional[str]
    meeting_url: Optional[str]
    duration_seconds: int
    meeting_date: datetime
    executive_summary: Optional[str]
    one_minute_read: Optional[str]
    followup_email: Optional[str]
    sentiment_summary: Optional[str]
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    speakers: List[SpeakerOut]
    transcripts: List[TranscriptSegmentOut]
    action_items: List[ActionItemOut]
    decisions: List[DecisionOut]
    risks: List[RiskOut]
    questions: List[QuestionOut]
    agenda_items: Optional[List[dict]] = None
    technical_context: Optional[dict] = None
    language: Optional[str] = None
    key_themes: Optional[List[str]] = None
    main_takeaways: Optional[List[str]] = None
    important_quotes: Optional[List[dict]] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[MeetingListOut])
def get_meetings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Automatically clean up stuck meetings (older than 15 minutes in non-terminal states)
    try:
        stale_threshold = datetime.utcnow() - timedelta(minutes=15)
        stuck_meetings = (
            db.query(Meeting)
            .filter(
                Meeting.organization_id == current_user.organization_id,
                Meeting.status.in_(
                    [
                        "UPLOADED",
                        "PROCESSING",
                        "TRANSCRIBED",
                        "ANALYZING",
                        "Uploaded",
                        "Processing",
                        "Transcribed",
                        "Analyzing",
                        "uploaded",
                        "processing",
                        "transcribed",
                        "analyzing",
                    ]
                ),
                Meeting.created_at < stale_threshold,
            )
            .all()
        )
        if stuck_meetings:
            for m in stuck_meetings:
                m.status = "FAILED"
                if m.ai_status in ["RUNNING", "PENDING"]:
                    m.ai_status = "FAILED"
                if m.embedding_status in ["RUNNING", "PENDING"]:
                    m.embedding_status = "FAILED"
                if m.speaker_status in ["RUNNING", "PENDING"]:
                    m.speaker_status = "FAILED"
                if m.kg_status in ["RUNNING", "PENDING"]:
                    m.kg_status = "FAILED"
            db.commit()
    except Exception as e:
        logger.error(f"Error cleaning up stuck meetings: {e}")
        db.rollback()

    meetings = (
        db.query(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .order_by(Meeting.meeting_date.desc())
        .all()
    )
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
        if (
            meeting.status
            in [
                "UPLOADED",
                "PROCESSING",
                "TRANSCRIBED",
                "ANALYZING",
                "Uploaded",
                "Processing",
                "Transcribed",
                "Analyzing",
                "uploaded",
                "processing",
                "transcribed",
                "analyzing",
            ]
            and meeting.created_at < stale_threshold
        ):
            meeting.status = "FAILED"
            if meeting.ai_status in ["RUNNING", "PENDING"]:
                meeting.ai_status = "FAILED"
            if meeting.embedding_status in ["RUNNING", "PENDING"]:
                meeting.embedding_status = "FAILED"
            if meeting.speaker_status in ["RUNNING", "PENDING"]:
                meeting.speaker_status = "FAILED"
            if meeting.kg_status in ["RUNNING", "PENDING"]:
                meeting.kg_status = "FAILED"
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
        status="UPLOADED",
        ai_status="PENDING",
        embedding_status="PENDING",
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
        meeting.status = "FAILED"
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


class JoinMeetingLinkRequest(BaseModel):
    title: str
    platform: str
    meeting_url: str
    meeting_date: Optional[datetime] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


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
        status="UPLOADED",
        ai_status="PENDING",
        embedding_status="PENDING",
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

    meeting.status = "PROCESSING"
    db.commit()
    MeetingContextCache.invalidate(meeting_id)

    media_service = MediaService()
    try:
        saved_file_path = media_service.save_uploaded_file(file, meeting, db)
    except Exception as save_err:
        meeting.status = "FAILED"
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

    meeting.status = "PROCESSING"
    db.commit()
    MeetingContextCache.invalidate(meeting_id)
    try:
        from app.services.pipeline.pipeline_manager import PipelineManager

        PipelineManager.trigger_pipeline(db, meeting.id, saved_file_path)
    except Exception as e:
        print(f"Failed to queue Celery processing: {e}")

    return meeting


class RenameSpeakerRequest(BaseModel):
    display_name: str


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
