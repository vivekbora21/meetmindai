from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel


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
    transcript_status: Optional[str] = None
    executive_summary_status: Optional[str] = None
    action_items_status: Optional[str] = None
    decisions_status: Optional[str] = None
    risks_status: Optional[str] = None
    technical_status: Optional[str] = None
    key_themes_status: Optional[str] = None
    platform: str
    duration_seconds: int
    meeting_date: datetime
    created_at: datetime
    meeting_url: Optional[str] = None
    recording_url: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    provider: Optional[str] = None
    provider_event_id: Optional[str] = None

    # Detailed fields for dashboard/calendar
    executive_summary: Optional[str] = None
    description: Optional[str] = None
    action_items_count: Optional[int] = 0
    decisions_count: Optional[int] = 0
    attendees: Optional[List[Any]] = None

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
    transcript_status: Optional[str] = None
    executive_summary_status: Optional[str] = None
    action_items_status: Optional[str] = None
    decisions_status: Optional[str] = None
    risks_status: Optional[str] = None
    technical_status: Optional[str] = None
    key_themes_status: Optional[str] = None
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


class JoinMeetingLinkRequest(BaseModel):
    title: str
    platform: str
    meeting_url: str
    meeting_date: Optional[datetime] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    provider: Optional[str] = None
    members: Optional[List[str]] = []
    bot_name: Optional[str] = "MeetMind Bot"


class RenameSpeakerRequest(BaseModel):
    display_name: str
