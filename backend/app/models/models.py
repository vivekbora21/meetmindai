import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Table,
    Text,
    Boolean,
    JSON,
    Index,
    func,
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database.connection import Base

from enum import Enum

class Provider(str, Enum):
    MICROSOFT = "microsoft"
    GOOGLE = "google"
    ZOOM = "zoom"
    SLACK = "slack"
    DISCORD = "discord"
    WEBEX = "webex"



class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    users = relationship(
        "User", back_populates="organization", cascade="all, delete-orphan"
    )
    meetings = relationship(
        "Meeting", back_populates="organization", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="Member")  # Admin, Member, Observer
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="users")
    action_items = relationship("ActionItem", back_populates="assigned_user")
    chat_messages = relationship(
        "ChatMessage", back_populates="user", cascade="all, delete-orphan"
    )
    chat_sessions = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )

    # New Profile & Account Settings Relationships
    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    integrations = relationship(
        "ConnectedAccount", back_populates="user", cascade="all, delete-orphan"
    )
    ai_preference = relationship(
        "AIPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    meeting_preference = relationship(
        "MeetingPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notification_setting = relationship(
        "NotificationSetting",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    security_setting = relationship(
        "UserSecuritySetting",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    api_keys = relationship(
        "APIKey", back_populates="user", cascade="all, delete-orphan"
    )
    storage_usage = relationship(
        "StorageUsage",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    personalization = relationship(
        "PersonalizationSetting",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    privacy_setting = relationship(
        "PrivacySetting",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    activity_logs = relationship(
        "ActivityLog", back_populates="user", cascade="all, delete-orphan"
    )


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)
    meeting_url = Column(Text, nullable=True)
    recording_url = Column(Text, nullable=True)
    original_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    content_type = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, default=0)
    status = Column(
        String(50), default="UPLOADED", server_default="UPLOADED"
    )  # UPLOADED, PROCESSING, TRANSCRIBED, ANALYZING, COMPLETED, FAILED
    ai_status = Column(
        String(50), default="PENDING", server_default="PENDING"
    )  # PENDING, RUNNING, SUCCESS, FAILED, SKIPPED
    embedding_status = Column(
        String(50), default="PENDING", server_default="PENDING"
    )  # PENDING, RUNNING, SUCCESS, FAILED
    speaker_status = Column(
        String(50), default="PENDING", server_default="PENDING"
    )  # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    kg_status = Column(
        String(50), default="PENDING", server_default="PENDING"
    )  # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    platform = Column(String(50), default="Upload")  # Upload, Google Meet, Teams, Jira
    meeting_date = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    provider = Column(String(50), nullable=True)  # google_meet, microsoft_teams, zoom, etc.
    provider_meeting_id = Column(String(255), nullable=True)
    provider_event_id = Column(String(255), nullable=True)
    calendar_id = Column(String(255), nullable=True)
    organizer_email = Column(String(255), nullable=True)
    sync_status = Column(String(50), nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    join_status = Column(String(50), default="Scheduled", server_default="Scheduled")
    token_reference = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    attendees = Column(JSON, nullable=True)


    # Summary and AI Insights cached fields
    executive_summary = Column(Text, nullable=True)
    one_minute_read = Column(Text, nullable=True)
    followup_email = Column(Text, nullable=True)
    sentiment_summary = Column(Text, nullable=True)
    agenda_items = Column(JSON, nullable=True)
    technical_context = Column(JSON, nullable=True)
    language = Column(String(50), nullable=True)
    key_themes = Column(JSON, nullable=True)
    main_takeaways = Column(JSON, nullable=True)
    important_quotes = Column(JSON, nullable=True)

    organization = relationship("Organization", back_populates="meetings")
    transcripts = relationship(
        "Transcript",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="Transcript.start_time",
    )
    action_items = relationship(
        "ActionItem", back_populates="meeting", cascade="all, delete-orphan"
    )
    decisions = relationship(
        "Decision", back_populates="meeting", cascade="all, delete-orphan"
    )
    risks = relationship("Risk", back_populates="meeting", cascade="all, delete-orphan")
    questions = relationship(
        "Question", back_populates="meeting", cascade="all, delete-orphan"
    )
    speakers = relationship(
        "MeetingSpeaker", back_populates="meeting", cascade="all, delete-orphan"
    )
    chat_messages = relationship(
        "ChatMessage", back_populates="meeting", cascade="all, delete-orphan"
    )
    chat_sessions = relationship(
        "ChatSession", back_populates="meeting", cascade="all, delete-orphan"
    )
    chunks = relationship(
        "MeetingChunk",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="MeetingChunk.chunk_index",
    )




class MeetingSpeaker(Base):
    __tablename__ = "meeting_speakers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    speaker_number = Column(Integer, nullable=False)  # 1, 2, 3...
    display_name = Column(String(255), nullable=False)
    voice_embedding = Column(JSON, nullable=True)  # List of floats (192-dim)
    confidence = Column(Float, nullable=True)
    is_confirmed = Column(Boolean, default=False)
    contribution_percentage = Column(Float, nullable=True)
    has_conflict = Column(Boolean, default=False)
    conflict_details = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    meeting = relationship("Meeting", back_populates="speakers")
    transcripts = relationship(
        "Transcript", back_populates="speaker", cascade="all, delete-orphan"
    )

    @property
    def speaker_tag(self) -> str:
        return f"SPEAKER_{self.speaker_number:02d}"

    __table_args__ = (
        Index("idx_meeting_speaker_num", "meeting_id", "speaker_number", unique=True),
    )


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    speaker_id = Column(
        String(36),
        ForeignKey("meeting_speakers.id", ondelete="SET NULL"),
        nullable=True,
    )
    start_time = Column(Float, nullable=False)  # in seconds
    end_time = Column(Float, nullable=False)  # in seconds
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # 1536 dimension vector for RAG
    embedding = Column(Vector(1536), nullable=True)

    meeting = relationship("Meeting", back_populates="transcripts")
    speaker = relationship("MeetingSpeaker", back_populates="transcripts")

    @property
    def speaker_tag(self) -> str:
        return self.speaker.speaker_tag if self.speaker else "UNKNOWN"

    @property
    def start_ms(self) -> int:
        return int(self.start_time * 1000)

    @property
    def end_ms(self) -> int:
        return int(self.end_time * 1000)


class MeetingChunk(Base):
    __tablename__ = "meeting_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=True)  # 384 dimensions for bge-small-en-v1.5
    speaker = Column(String(255), nullable=True)
    timestamp_start = Column(Float, nullable=True)  # in seconds
    timestamp_end = Column(Float, nullable=True)    # in seconds
    created_at = Column(DateTime, server_default=func.now())

    meeting = relationship("Meeting", back_populates="chunks")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    assigned_to = Column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Pending")  # Pending, Completed, Blocked
    priority = Column(String(50), default="Medium")  # High, Medium, Low
    due_date = Column(DateTime, nullable=True)
    confidence_score = Column(Float, default=1.0)
    jira_issue_key = Column(String(100), nullable=True)

    meeting = relationship("Meeting", back_populates="action_items")
    assigned_user = relationship("User", back_populates="action_items")


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    decision_text = Column(Text, nullable=False)
    rationale = Column(Text, nullable=True)
    confidence_score = Column(Float, default=1.0)

    meeting = relationship("Meeting", back_populates="decisions")


class Risk(Base):
    __tablename__ = "risks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    risk_text = Column(Text, nullable=False)
    mitigation = Column(Text, nullable=True)
    severity = Column(String(50), default="Medium")  # Critical, High, Medium, Low

    meeting = relationship("Meeting", back_populates="risks")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    question_text = Column(Text, nullable=False)

    meeting = relationship("Meeting", back_populates="questions")


class KnowledgeGraphNode(Base):
    __tablename__ = "knowledge_graph_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    entity_type = Column(
        String(50), nullable=False
    )  # Person, Project, Technology, Meeting, Repository
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)

    __table_args__ = (
        Index(
            "idx_org_entity_name", "organization_id", "entity_type", "name", unique=True
        ),
    )


class KnowledgeGraphEdge(Base):
    __tablename__ = "knowledge_graph_edges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    source_node_id = Column(
        String(36),
        ForeignKey("knowledge_graph_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_node_id = Column(
        String(36),
        ForeignKey("knowledge_graph_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    relationship_type = Column(
        String(100), nullable=False
    )  # e.g., "MEMBER_OF", "USES", "DISCUSSED_IN"
    weight = Column(Float, default=1.0)


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    provider = Column(String(50), nullable=False)  # jira, github, slack
    credentials = Column(JSON, nullable=False)  # Encrypted tokens or configurations
    is_active = Column(Boolean, default=True)


class AgentProfile(Base):
    __tablename__ = "agent_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    bot_display_name = Column(String(100), default="MeetingMind AI")
    auto_join_rules = Column(
        JSON, nullable=True
    )  # {"internal_only": true, "max_duration_minutes": 120}
    created_at = Column(DateTime, server_default=func.now())


class ScheduledMeeting(Base):
    __tablename__ = "scheduled_meetings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    meeting_url = Column(String(500), nullable=False)
    title = Column(String(200), nullable=True)
    platform = Column(String(50), nullable=False)  # 'Teams', 'Google Meet', 'Zoom'
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    status = Column(
        String(50), default="Scheduled"
    )  # 'Scheduled', 'Joined', 'Completed', 'Failed'
    created_at = Column(DateTime, server_default=func.now())
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True
    )


class AgentLiveSession(Base):
    __tablename__ = "agent_live_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_meeting_id = Column(
        String(36),
        ForeignKey("scheduled_meetings.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(
        String(50), nullable=False, default="Connecting"
    )  # 'Connecting', 'Live', 'Completed', 'Error'
    participants_count = Column(Integer, default=0)
    health_score = Column(Float, default=100.0)
    start_time = Column(DateTime, server_default=func.now())
    end_time = Column(DateTime, nullable=True)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=True
    )
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)
    is_archived = Column(Boolean, default=False, server_default="false")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    meeting = relationship("Meeting", back_populates="chat_sessions")
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=True
    )
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    session_id = Column(
        String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=True
    )
    role = Column(String(50), nullable=False)  # "user" or "assistant"
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    meeting = relationship("Meeting", back_populates="chat_messages")
    user = relationship("User", back_populates="chat_messages")
    session = relationship("ChatSession", back_populates="messages")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    profile_picture = Column(String(255), nullable=True)
    username = Column(String(255), unique=True, index=True, nullable=True)
    phone_number = Column(String(50), nullable=True)
    job_title = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    time_zone = Column(String(100), default="UTC")
    preferred_language = Column(String(50), default="en")
    last_login = Column(DateTime, nullable=True)
    account_status = Column(String(50), default="Active")
    subscription_plan = Column(String(50), default="Free")
    email_verified = Column(Boolean, default=False)

    user = relationship("User", back_populates="profile")


class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider = Column(
        String(50), nullable=False
    )  # microsoft, google, zoom, etc.
    provider_user_id = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    token_type = Column(String(50), default="Bearer")
    connection_status = Column(
        String(50), default="Connected"
    )  # Connected, Disconnected, Expired
    last_sync = Column(DateTime, nullable=True)
    sync_errors = Column(Text, nullable=True)

    auto_sync = Column(Boolean, default=True)
    recording_import = Column(Boolean, default=True)
    calendar_sync = Column(Boolean, default=True)

    scope = Column(String(500), nullable=True)
    connected_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="integrations")

    @property
    def token_expiry(self):
        return self.expires_at

    @token_expiry.setter
    def token_expiry(self, value):
        self.expires_at = value



class AIPreference(Base):
    __tablename__ = "ai_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    preferred_provider = Column(
        String(50), default="Gemini"
    )  # OpenAI, Gemini, Groq, Claude
    fallback_provider = Column(String(50), default="OpenAI")
    preferred_model = Column(String(100), default="gemini-1.5-flash")
    temperature = Column(Float, default=0.7)
    summary_length = Column(String(50), default="Medium")  # Short, Medium, Detailed
    response_style = Column(
        String(50), default="Professional"
    )  # Executive, Professional, Technical, Developer, Simple

    enable_chat_memory = Column(Boolean, default=True)
    enable_semantic_search = Column(Boolean, default=True)
    enable_context_retrieval = Column(Boolean, default=True)
    enable_kg_generation = Column(Boolean, default=True)
    enable_speaker_intelligence = Column(Boolean, default=True)
    enable_automatic_insights = Column(Boolean, default=True)

    user = relationship("User", back_populates="ai_preference")


class MeetingPreference(Base):
    __tablename__ = "meeting_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    default_language = Column(String(50), default="en")
    enable_speaker_id = Column(Boolean, default=True)
    enable_translation = Column(Boolean, default=False)
    enable_subtitles = Column(Boolean, default=False)
    transcript_format = Column(String(50), default="TXT")  # TXT, VTT, SRT
    default_category = Column(String(100), default="General")
    recording_retention_days = Column(Integer, default=30)
    auto_delete_recordings = Column(Boolean, default=False)
    meeting_privacy = Column(String(50), default="Private")
    default_share_settings = Column(JSON, nullable=True)

    auto_import_meetings = Column(Boolean, default=True)
    auto_import_recordings = Column(Boolean, default=True)
    auto_generate_transcript = Column(Boolean, default=True)
    auto_generate_summary = Column(Boolean, default=True)
    auto_create_action_items = Column(Boolean, default=True)
    auto_create_risks = Column(Boolean, default=True)
    auto_create_kg = Column(Boolean, default=True)
    auto_create_tech_analysis = Column(Boolean, default=True)
    auto_create_decisions = Column(Boolean, default=True)

    calendar_sync_frequency = Column(String(50), default="Every 15 Minutes")
    recording_preference = Column(String(50), default="Ask Before Import")

    user = relationship("User", back_populates="meeting_preference")


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    meeting_uploaded = Column(
        JSON,
        default=lambda: {
            "email": True,
            "browser": True,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )
    transcript_ready = Column(
        JSON,
        default=lambda: {
            "email": False,
            "browser": True,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )
    ai_summary_ready = Column(
        JSON,
        default=lambda: {
            "email": True,
            "browser": True,
            "push": True,
            "slack": False,
            "teams": False,
        },
    )
    kg_ready = Column(
        JSON,
        default=lambda: {
            "email": False,
            "browser": True,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )
    action_items_ready = Column(
        JSON,
        default=lambda: {
            "email": True,
            "browser": True,
            "push": True,
            "slack": False,
            "teams": False,
        },
    )
    failed_processing = Column(
        JSON,
        default=lambda: {
            "email": True,
            "browser": True,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )
    calendar_sync = Column(
        JSON,
        default=lambda: {
            "email": False,
            "browser": False,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )
    oauth_expired = Column(
        JSON,
        default=lambda: {
            "email": True,
            "browser": True,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )
    weekly_reports = Column(
        JSON,
        default=lambda: {
            "email": True,
            "browser": False,
            "push": False,
            "slack": False,
            "teams": False,
        },
    )

    user = relationship("User", back_populates="notification_setting")


class UserSecuritySetting(Base):
    __tablename__ = "user_security_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    backup_codes = Column(JSON, nullable=True)
    security_notifications = Column(Boolean, default=True)

    user = relationship("User", back_populates="security_setting")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    device = Column(String(255), nullable=True)
    ip_address = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="sessions")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), unique=True, index=True, nullable=False)
    key_prefix = Column(String(8), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="api_keys")


class StorageUsage(Base):
    __tablename__ = "storage_usage"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    recordings_bytes = Column(Float, default=0.0)
    transcripts_bytes = Column(Float, default=0.0)
    kg_bytes = Column(Float, default=0.0)
    embeddings_bytes = Column(Float, default=0.0)
    reports_bytes = Column(Float, default=0.0)
    chat_bytes = Column(Float, default=0.0)
    total_limit_bytes = Column(Float, default=10.0 * 1024 * 1024 * 1024)  # 10 GB

    user = relationship("User", back_populates="storage_usage")


class PersonalizationSetting(Base):
    __tablename__ = "personalization_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    theme = Column(String(50), default="System Theme")
    accent_color = Column(String(50), default="Teal")
    compact_mode = Column(Boolean, default=False)
    date_format = Column(String(50), default="YYYY-MM-DD")
    time_format = Column(String(50), default="12h")
    default_landing_page = Column(String(100), default="Dashboard")
    sidebar_expanded = Column(Boolean, default=True)

    user = relationship("User", back_populates="personalization")


class PrivacySetting(Base):
    __tablename__ = "privacy_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    data_retention_days = Column(Integer, default=365)
    ai_training_opt_out = Column(Boolean, default=True)

    user = relationship("User", back_populates="privacy_setting")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="activity_logs")



class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider = Column(String(50), nullable=False)  # "microsoft"
    provider_event_id = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    timezone = Column(String(100), nullable=True)
    organizer_email = Column(String(255), nullable=True)
    join_url = Column(Text, nullable=True)
    meeting_provider = Column(String(100), nullable=True)
    is_online_meeting = Column(Boolean, default=False)
    status = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="calendar_events")

    __table_args__ = (
        Index("idx_user_provider_event", "user_id", "provider", "provider_event_id", unique=True),
    )


