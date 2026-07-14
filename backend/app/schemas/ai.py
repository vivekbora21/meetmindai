from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ChatFilter(BaseModel):
    platform: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    meeting_id: Optional[str] = None
    participants: Optional[List[str]] = None
    project: Optional[str] = None


class WorkspaceChatQuery(BaseModel):
    question: str
    filters: Optional[ChatFilter] = None
    session_id: Optional[str] = None
    stream: Optional[bool] = True


class ManualIndexQuery(BaseModel):
    meeting_id: str


class WorkspaceChatResponse(BaseModel):
    answer: str
    confidence_score: float
    sources: List[Dict[str, Any]]
    suggested_questions: List[str]
    session_id: str


class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    is_archived: bool

    class Config:
        from_attributes = True


class RegenerateQuery(BaseModel):
    session_id: str
    filters: Optional[ChatFilter] = None
    stream: Optional[bool] = True
