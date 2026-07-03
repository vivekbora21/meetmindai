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

# Many-to-Many association for users and integrations (if needed)
# Here we define the direct structures for the platform


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
    platform = Column(String(50), default="Upload")  # Upload, Google Meet, Teams, Jira
    meeting_date = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    # Summary and AI Insights cached fields
    executive_summary = Column(Text, nullable=True)
    one_minute_read = Column(Text, nullable=True)
    followup_email = Column(Text, nullable=True)
    sentiment_summary = Column(Text, nullable=True)

    organization = relationship("Organization", back_populates="meetings")
    transcripts = relationship(
        "TranscriptSegment", back_populates="meeting", cascade="all, delete-orphan"
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
        "Speaker", back_populates="meeting", cascade="all, delete-orphan"
    )


class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    speaker_tag = Column(String(50), nullable=False)  # e.g. "SPEAKER_00", "SPEAKER_01"
    display_name = Column(String(255), nullable=False)

    meeting = relationship("Meeting", back_populates="speakers")

    __table_args__ = (
        Index("idx_meeting_speaker", "meeting_id", "speaker_tag", unique=True),
    )


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    speaker_tag = Column(String(50), nullable=False)
    text = Column(Text, nullable=False)

    # 1536 dimension vector for OpenAI text-embedding-3-small or text-embedding-ada-002
    embedding = Column(Vector(1536), nullable=True)

    meeting = relationship("Meeting", back_populates="transcripts")


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
