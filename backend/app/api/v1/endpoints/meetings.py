import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database.connection import get_db
from app.models.models import Meeting, User, TranscriptSegment, ActionItem, Decision, Risk, Question, Speaker, ScheduledMeeting, AgentLiveSession
from app.api.v1.endpoints.auth import get_current_user

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
    platform: str
    duration_seconds: int
    meeting_date: datetime
    created_at: datetime
    meeting_url: Optional[str] = None
    class Config:
        from_attributes = True

class MeetingDetailOut(BaseModel):
    id: str
    title: str
    status: str
    platform: str
    recording_url: Optional[str]
    meeting_url: Optional[str]
    duration_seconds: int
    meeting_date: datetime
    executive_summary: Optional[str]
    one_minute_read: Optional[str]
    followup_email: Optional[str]
    sentiment_summary: Optional[str]
    speakers: List[SpeakerOut]
    transcripts: List[TranscriptSegmentOut]
    action_items: List[ActionItemOut]
    decisions: List[DecisionOut]
    risks: List[RiskOut]
    questions: List[QuestionOut]
    class Config:
        from_attributes = True

@router.get("/", response_model=List[MeetingListOut])
def get_meetings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Tenant isolation: filter by current_user's organization_id
    meetings = db.query(Meeting).filter(Meeting.organization_id == current_user.organization_id).order_by(Meeting.meeting_date.desc()).all()
    return meetings

@router.get("/{meeting_id}", response_model=MeetingDetailOut)
def get_meeting(meeting_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id, 
        Meeting.organization_id == current_user.organization_id
    ).first()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return meeting

@router.post("/upload", response_model=MeetingListOut, status_code=status.HTTP_202_ACCEPTED)
def upload_meeting(
    title: str = Form(...),
    meeting_date: Optional[str] = Form(None),
    platform: Optional[str] = Form("Upload"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Parse meeting date
    parsed_date = datetime.utcnow()
    if meeting_date:
        try:
            parsed_date = datetime.fromisoformat(meeting_date)
        except ValueError:
            pass

    # Save metadata to DB
    meeting = Meeting(
        title=title,
        meeting_date=parsed_date,
        organization_id=current_user.organization_id,
        status="Processing",
        platform=platform,
        recording_url=None,
        meeting_url=None
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # In production, we upload file to S3/MinIO and queue the Celery worker task.
    # We will trigger the background worker here!
    # For now, let's import celery task inline or trigger it.
    try:
        from app.tasks.meeting_tasks import process_meeting_audio
        process_meeting_audio.delay(meeting.id, file.filename)
    except Exception as e:
        # If celery is not running, we degrade gracefully and log it.
        print(f"Failed to queue Celery processing: {e}")
        
    return meeting


class JoinMeetingLinkRequest(BaseModel):
    title: str
    platform: str
    meeting_url: str
    meeting_date: Optional[datetime] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


@router.post("/join-link", response_model=MeetingListOut, status_code=status.HTTP_202_ACCEPTED)
def join_meeting_by_link(
    request: JoinMeetingLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    parsed_date = request.meeting_date or datetime.utcnow()
    scheduled_start = request.scheduled_start or parsed_date
    scheduled_end = request.scheduled_end or (scheduled_start + timedelta(minutes=30))
    
    # Save metadata to DB
    meeting = Meeting(
        title=request.title,
        meeting_date=parsed_date,
        organization_id=current_user.organization_id,
        status="Processing",
        platform=request.platform,
        recording_url=None,
        meeting_url=request.meeting_url
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
        status="Connecting"
    )
    db.add(session)
    db.commit()

    # Trigger the connector job in Celery so the bot can join when the meeting starts.
    try:
        from app.tasks.meeting_tasks import join_scheduled_meeting
        join_scheduled_meeting.apply_async(args=[scheduled_meeting.id], eta=scheduled_start)
    except Exception as e:
        print(f"Failed to start live agent: {e}")

    return meeting
