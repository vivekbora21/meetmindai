from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


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
    attendees: Optional[List[dict]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
