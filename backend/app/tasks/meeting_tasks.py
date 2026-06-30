import time
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.celery_app import celery_app
from app.database.connection import SessionLocal
from app.config.settings import get_env
from app.models.models import (
    Meeting, TranscriptSegment, ActionItem, Decision, Risk, Question, Speaker,
    KnowledgeGraphNode, KnowledgeGraphEdge, ScheduledMeeting, AgentLiveSession
)

def _normalize_platform(platform: str) -> str:
    platform = (platform or "").lower()
    if "teams" in platform:
        return "Teams"
    if "meet" in platform:
        return "Google Meet"
    if "zoom" in platform:
        return "Zoom"
    return "Unknown"

@celery_app.task
def process_meeting_audio(meeting_id: str, file_name: str):
    """
    Phase 4 Pipeline: Speech-to-Text & Diarization
    Downloads audio file, runs transcription, and extracts speech diarization tags.
    """
    print(f"[{meeting_id}] Downloading and processing audio file: {file_name}")
    db: Session = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            print(f"[{meeting_id}] Meeting not found.")
            return

        # Simulate Whisper and speaker diarization latency
        time.sleep(5)

        # Seeding speakers
        speakers_data = [
            ("SPEAKER_00", "Vivek Sharma"),
            ("SPEAKER_01", "Alex Rivera")
        ]
        for tag, name in speakers_data:
            speaker = Speaker(meeting_id=meeting_id, speaker_tag=tag, display_name=name)
            db.add(speaker)
        db.commit()

        # Seed clean mock transcripts
        transcripts = [
            (0, 12000, "SPEAKER_00", "Okay, let's start the security review. We need to decide if we are sticking with our self-hosted token authentication or migrating to a managed service."),
            (12000, 32000, "SPEAKER_01", "Migrating to Clerk or Auth.js would save us a lot of code complexity. It supports SAML and OAuth out of the box, which is a major requirement for our enterprise leads."),
            (32000, 54000, "SPEAKER_00", "Agreed. But we must ensure organization tenant isolation at the PostgreSQL layer. I will create a new tenant column in every table and write database helper utilities. Let's aim to have schemas ready by Friday."),
            (54000, 78000, "SPEAKER_01", "Great. I will handle the frontend auth logic. We can store the session tokens in Zustand and use TanStack Query for refetching.")
        ]

        for start, end, tag, text in transcripts:
            segment = TranscriptSegment(
                meeting_id=meeting_id,
                start_ms=start,
                end_ms=end,
                speaker_tag=tag,
                text=text,
                embedding=None # Will be updated in embeddings phase
            )
            db.add(segment)
        db.commit()

        meeting.duration_seconds = 78
        db.commit()

        print(f"[{meeting_id}] Transcription complete. Offloading to AI extraction...")
        analyze_transcript_ai.delay(meeting_id)

    except Exception as e:
        print(f"[{meeting_id}] Ingestion pipeline failure: {e}")
        if meeting:
            meeting.status = "Failed"
            db.commit()
    finally:
        db.close()

@celery_app.task
def analyze_transcript_ai(meeting_id: str):
    """
    Phase 5 Pipeline: AI Agent summary extraction (LangGraph/LLM orchestrator)
    """
    print(f"[{meeting_id}] Performing AI semantic analysis...")
    db: Session = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        # Simulate LLM prompt chain execution
        time.sleep(4)

        # Update meeting summary fields
        meeting.executive_summary = "In this session, the team resolved to replace our custom authentication solution with Auth.js/Clerk. Vivek Sharma will oversee the database modifications, ensuring organization segregation, while Alex Rivera will migrate the frontend components. We flagged risks around migrating legacy passwords and set a firm launch date for the staging release."
        meeting.one_minute_read = "We are migrating from custom auth to Auth.js/Clerk for multi-tenancy support. Vivek Sharma owns database schemas, Alex Rivera owns frontend code. Staging release is targeted for Friday."
        meeting.followup_email = "Hi team,\n\nFollowing up on our authentication session today, we've finalized our migration plan to Auth.js/Clerk.\n\nKey Action Items:\n- DB multi-tenant schema edits (Vivek Sharma) - Due: July 3\n- Frontend OAuth and Clerk setup (Alex Rivera) - Due: July 5"
        meeting.sentiment_summary = "High collaboration. Vivek Sharma showed urgency about database tenant protection."
        
        # Save Action Items
        action_1 = ActionItem(
            meeting_id=meeting_id,
            description="Design PostgreSQL tenant isolation schemas & foreign key constraints",
            status="Pending",
            priority="High",
            due_date=None, # Will be set to Friday
            confidence_score=0.98
        )
        action_2 = ActionItem(
            meeting_id=meeting_id,
            description="Integrate Clerk / Auth.js in Next.js 15 routing files",
            status="Pending",
            priority="High",
            due_date=None,
            confidence_score=0.94
        )
        db.add_all([action_1, action_2])
        db.commit()

        # Save Decisions
        decision = Decision(
            meeting_id=meeting_id,
            decision_text="Migrate auth strategy from self-hosted token DB to Auth.js/Clerk",
            rationale="Saves maintenance time and easily supports enterprise SAML/OAuth",
            confidence_score=0.96
        )
        db.add(decision)
        db.commit()

        # Save Risks
        risk = Risk(
            meeting_id=meeting_id,
            risk_text="Legacy password migration conflict",
            mitigation="Require password reset or implement custom hashing middleware",
            severity="High"
        )
        db.add(risk)
        db.commit()

        # Save Questions
        question = Question(
            meeting_id=meeting_id,
            question_text="Do we need self-hosted Redis for token rate limiting?"
        )
        db.add(question)
        db.commit()

        print(f"[{meeting_id}] AI insight extraction completed. Generating embeddings...")
        generate_embeddings.delay(meeting_id)

    except Exception as e:
        print(f"[{meeting_id}] AI extraction failed: {e}")
        meeting.status = "Failed"
        db.commit()
    finally:
        db.close()

@celery_app.task
def generate_embeddings(meeting_id: str):
    """
    Phase 6 Pipeline: pgvector RAG Embedding seeding
    """
    print(f"[{meeting_id}] Seeding segment vector embeddings...")
    db: Session = SessionLocal()
    try:
        segments = db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting_id).all()
        
        # Inject standard dummy 1536 float arrays so vector operations can execute
        dummy_embedding = [0.01] * 1536
        for segment in segments:
            segment.embedding = dummy_embedding
        db.commit()

        print(f"[{meeting_id}] Embedding generation completed. Updating Knowledge Graph...")
        update_knowledge_graph.delay(meeting_id)

    except Exception as e:
        print(f"[{meeting_id}] Embeddings generation failed: {e}")
    finally:
        db.close()

@celery_app.task
def update_knowledge_graph(meeting_id: str):
    """
    Phase 7 Pipeline: Knowledge Graph Link Resolutions
    """
    print(f"[{meeting_id}] Populating organization knowledge graph...")
    db: Session = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        # Seed mock project and tech nodes linked to this meeting
        org_id = meeting.organization_id
        
        nodes_to_create = [
            ("Person", "Vivek Sharma", "Architect"),
            ("Project", "Auth Migration", "Managed Auth overhaul"),
            ("Technology", "PostgreSQL Database", "ACID vector store")
        ]

        created_nodes = []
        for etype, name, desc in nodes_to_create:
            # Check if exists
            node = db.query(KnowledgeGraphNode).filter(
                KnowledgeGraphNode.organization_id == org_id,
                KnowledgeGraphNode.entity_type == etype,
                KnowledgeGraphNode.name == name
            ).first()
            if not node:
                node = KnowledgeGraphNode(
                    organization_id=org_id,
                    entity_type=etype,
                    name=name,
                    description=desc
                )
                db.add(node)
                db.commit()
                db.refresh(node)
            created_nodes.append(node)

        # Create connections (edges)
        for i in range(len(created_nodes) - 1):
            source = created_nodes[i]
            target = created_nodes[i+1]
            
            edge_exists = db.query(KnowledgeGraphEdge).filter(
                KnowledgeGraphEdge.organization_id == org_id,
                KnowledgeGraphEdge.source_node_id == source.id,
                KnowledgeGraphEdge.target_node_id == target.id
            ).first()
            
            if not edge_exists:
                edge = KnowledgeGraphEdge(
                    organization_id=org_id,
                    source_node_id=source.id,
                    target_node_id=target.id,
                    relationship_type="DISCUSSED_IN"
                )
                db.add(edge)
        db.commit()

        # Update final meeting status
        meeting.status = "Completed"
        db.commit()
        print(f"[{meeting_id}] Ingestion pipeline finished successfully!")

    except Exception as e:
        print(f"[{meeting_id}] Knowledge Graph update failed: {e}")
    finally:
        db.close()

@celery_app.task
def join_scheduled_meeting(scheduled_meeting_id: str):
    """
    Phase 3b: Bot join orchestration for link-based meetings.
    Updates meeting/session rows and then routes to the platform connector simulator.
    """
    db: Session = SessionLocal()
    try:
        scheduled = db.query(ScheduledMeeting).filter(ScheduledMeeting.id == scheduled_meeting_id).first()
        if not scheduled:
            print(f"[{scheduled_meeting_id}] Scheduled meeting not found.")
            return

        meeting = db.query(Meeting).filter(Meeting.id == scheduled.meeting_id).first()
        if not meeting:
            print(f"[{scheduled_meeting_id}] Parent meeting not found.")
            scheduled.status = "Failed"
            db.commit()
            return

        scheduled.status = "Joined"
        meeting.status = "Processing"

        session = db.query(AgentLiveSession).filter(AgentLiveSession.scheduled_meeting_id == scheduled.id).first()
        if session:
            session.status = "Live"
        db.commit()

        platform = _normalize_platform(scheduled.platform)
        print(f"[{scheduled_meeting_id}] Bot joining {platform}: {scheduled.meeting_url}")

        if platform == "Teams":
            from app.agent.connectors.teams import TeamsConnector
            TeamsConnector().join_meeting(scheduled.meeting_url)
        elif platform == "Google Meet":
            from app.agent.connectors.meet import GoogleMeetConnector
            GoogleMeetConnector().join_meeting(scheduled.meeting_url)
        elif platform == "Zoom":
            from app.agent.connectors.zoom import ZoomConnector
            ZoomConnector().join_meeting(scheduled.meeting_url)
        else:
            print(f"[{scheduled_meeting_id}] Unsupported platform for auto-join: {scheduled.platform}")
            scheduled.status = "Failed"
            meeting.status = "Failed"
            if session:
                session.status = "Error"
            db.commit()
            return

        # Keep the demo pipeline moving so the meeting becomes usable in the product.
        process_meeting_audio.delay(meeting.id, scheduled.meeting_url)
    except Exception as e:
        print(f"[{scheduled_meeting_id}] Scheduled join failed: {e}")
        scheduled = db.query(ScheduledMeeting).filter(ScheduledMeeting.id == scheduled_meeting_id).first()
        if scheduled:
            scheduled.status = "Failed"
        db.commit()
    finally:
        db.close()
