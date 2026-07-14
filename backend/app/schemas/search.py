from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 5


class SearchResultItem(BaseModel):
    meeting_id: str
    meeting_title: str
    segment_id: str
    speaker_tag: str
    text: str
    start_ms: int
    end_ms: int
    score: float


class ChatQuery(BaseModel):
    meeting_id: Optional[str] = None  # If None, search across all meetings
    question: str


class ChatResponse(BaseModel):
    answer: str
    confidence_score: float
    sources: List[SearchResultItem]


class ChatMessageOut(BaseModel):
    id: str
    meeting_id: Optional[str] = None
    user_id: str
    session_id: Optional[str] = None
    role: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ChatSessionOut(BaseModel):
    id: str
    meeting_id: Optional[str] = None
    user_id: str
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetailOut(BaseModel):
    id: str
    meeting_id: Optional[str] = None
    user_id: str
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut]

    class Config:
        from_attributes = True


class TitleUpdate(BaseModel):
    title: str


class MessageInput(BaseModel):
    question: str


class ArchiveStatus(BaseModel):
    is_archived: bool
