from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.models import User, CalendarEvent
from app.services.microsoft_calendar import MicrosoftCalendarService

router = APIRouter()
calendar_service = MicrosoftCalendarService()


class CalendarEventOut(BaseModel):
    id: str
    user_id: str
    provider: str
    provider_event_id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    timezone: Optional[str] = None
    organizer_email: Optional[str] = None
    join_url: Optional[str] = None
    meeting_provider: Optional[str] = None
    is_online_meeting: bool
    status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/api/calendar/events", response_model=List[CalendarEventOut])
async def get_calendar_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Synchronizes upcoming Microsoft Calendar events and returns them.
    """
    events = await calendar_service.sync_calendar_events(db, current_user.id)
    # Sort events by start time ascending
    events.sort(key=lambda x: x.start_time)
    return events
