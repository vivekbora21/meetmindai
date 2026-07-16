import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.connection import get_db
from app.models.models import User
from app.helpers.auth import get_current_user
from app.schemas.meetings import (
    MeetingListOut,
    MeetingDetailOut,
    JoinMeetingLinkRequest,
    RenameSpeakerRequest,
)
from app.repositories.meeting_repository import meeting_repository
from app.services.meeting.meeting_service import meeting_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[MeetingListOut])
def get_meetings(
    include_future: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting_repository.clean_stuck_meetings(db, current_user.organization_id)
    return meeting_repository.get_user_meetings(db, current_user.organization_id, include_future)

@router.get("/{meeting_id}", response_model=MeetingDetailOut)
def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = meeting_repository.get(db, meeting_id, current_user.organization_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    cleaned = meeting_repository.clean_stuck_meetings(db, current_user.organization_id)
    if cleaned > 0:
        db.refresh(meeting)

    return meeting

@router.post("/upload", response_model=MeetingListOut, status_code=status.HTTP_202_ACCEPTED)
def upload_meeting(
    title: str = Form(...),
    meeting_date: Optional[str] = Form(None),
    platform: Optional[str] = Form("Upload"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return meeting_service.create_from_upload(db, current_user, title, meeting_date, platform, file)

@router.post("/join-link", response_model=MeetingListOut, status_code=status.HTTP_202_ACCEPTED)
def join_meeting_by_link(
    request: JoinMeetingLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return meeting_service.create_from_link(
        db, current_user, request.title, request.meeting_url, request.platform, 
        request.meeting_date, request.scheduled_start, request.scheduled_end
    )

@router.post("/{meeting_id}/upload-media", response_model=MeetingDetailOut)
def upload_meeting_media(
    meeting_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return meeting_service.upload_media(db, current_user, meeting_id, file)

@router.post("/{meeting_id}/transcribe", response_model=MeetingDetailOut)
def transcribe_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return meeting_service.transcribe_meeting(db, current_user, meeting_id)

@router.put("/{meeting_id}/speakers/{speaker_id}", response_model=MeetingDetailOut)
def rename_speaker(
    meeting_id: str,
    speaker_id: str,
    request: RenameSpeakerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return meeting_service.rename_speaker(db, current_user, meeting_id, speaker_id, request.display_name)

@router.post("/{meeting_id}/retry", response_model=MeetingDetailOut)
def retry_meeting_stage(
    meeting_id: str,
    stage: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return meeting_service.retry_stage(db, current_user, meeting_id, stage)

@router.post("/{meeting_id}/send-mom")
def send_meeting_mom_email(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = meeting_repository.get(db, meeting_id, current_user.organization_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    from app.tasks.meeting_tasks import send_mom_email
    send_mom_email.delay(meeting_id)

    return {"status": "success", "message": "MOM email dispatch initiated"}

