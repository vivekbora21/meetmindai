from typing import Optional, Dict
from pydantic import BaseModel, EmailStr


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    phone_number: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    country: Optional[str] = None
    time_zone: Optional[str] = None
    preferred_language: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class AIPreferenceUpdate(BaseModel):
    preferred_provider: str
    fallback_provider: str
    preferred_model: str
    temperature: float
    summary_length: str
    response_style: str
    enable_chat_memory: bool
    enable_semantic_search: bool
    enable_context_retrieval: bool
    enable_kg_generation: bool
    enable_speaker_intelligence: bool
    enable_automatic_insights: bool


class MeetingPreferenceUpdate(BaseModel):
    default_language: str
    enable_speaker_id: bool
    enable_translation: bool
    enable_subtitles: bool
    transcript_format: str
    default_category: str
    recording_retention_days: int
    auto_delete_recordings: bool
    meeting_privacy: str
    auto_import_meetings: bool
    auto_import_recordings: bool
    auto_generate_transcript: bool
    auto_generate_summary: bool
    auto_create_action_items: bool
    auto_create_risks: bool
    auto_create_kg: bool
    auto_create_tech_analysis: bool
    auto_create_decisions: bool
    calendar_sync_frequency: str
    recording_preference: str


class NotificationSettingUpdate(BaseModel):
    meeting_uploaded: Dict[str, bool]
    transcript_ready: Dict[str, bool]
    ai_summary_ready: Dict[str, bool]
    kg_ready: Dict[str, bool]
    action_items_ready: Dict[str, bool]
    failed_processing: Dict[str, bool]
    calendar_sync: Dict[str, bool]
    oauth_expired: Dict[str, bool]
    weekly_reports: Dict[str, bool]


class PersonalizationUpdate(BaseModel):
    theme: str
    accent_color: str
    compact_mode: bool
    date_format: str
    time_format: str
    default_landing_page: str
    sidebar_expanded: bool


class PrivacyUpdate(BaseModel):
    data_retention_days: int
    ai_training_opt_out: bool


class APIKeyCreate(BaseModel):
    name: str


class IntegrationConnect(BaseModel):
    provider: str
    email: str
    auto_sync: Optional[bool] = True
    recording_import: Optional[bool] = True
    calendar_sync: Optional[bool] = True
