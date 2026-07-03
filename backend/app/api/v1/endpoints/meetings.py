import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database.connection import get_db
from app.models.models import (
    Meeting,
    User,
    TranscriptSegment,
    ActionItem,
    Decision,
    Risk,
    Question,
    Speaker,
    ScheduledMeeting,
    AgentLiveSession,
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.media_service import MediaService

router = APIRouter()


# Schemas
class MeetingCreate(BaseModel):
    title: str
    meeting_date: Optional[datetime] = None


class SpeakerOut(BaseModel):
    speaker_tag: str
    display_name: str

    class Config:
        from_attributes = True


class TranscriptSegmentOut(BaseModel):
    start_ms: int
    end_ms: int
    speaker_tag: str
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

    class Config:
        from_attributes = True


@router.get("/", response_model=List[MeetingListOut])
def get_meetings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
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
        from app.tasks.meeting_tasks import process_meeting_audio

        process_meeting_audio.delay(meeting.id, saved_file_path)
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
        from app.tasks.meeting_tasks import process_meeting_audio

        process_meeting_audio.delay(meeting.id, saved_file_path)
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

    try:
        from app.tasks.meeting_tasks import process_meeting_audio

        process_meeting_audio.delay(meeting.id, saved_file_path)
    except Exception as e:
        print(f"Failed to queue Celery processing: {e}")

    return meeting
