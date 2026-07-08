from datetime import datetime
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db, SessionLocal
from app.models.models import Meeting, User, Transcript, ChatMessage, ChatSession
from app.api.v1.endpoints.auth import get_current_user
from app.services.embedding_service import EmbeddingService
from app.services.ai.gemini_service import GeminiService
from app.services.cache_service import MeetingContextCache

logger = logging.getLogger(__name__)
router = APIRouter()


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
    meeting_id: str
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
    meeting_id: str
    user_id: str
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetailOut(BaseModel):
    id: str
    meeting_id: str
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


@router.post("/semantic", response_model=List[SearchResultItem])
def semantic_search(
    search_input: SearchQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Performs vector similarity search on transcript segments using nomic embeddings.
    Falls back to a standard ILIKE search if vector search is unavailable.
    """
    if not search_input.query.strip():
        return []

    # Generate real embedding using EmbeddingService
    embedding_service = EmbeddingService()
    query_embedding = embedding_service.generate_embedding(search_input.query)

    results = []
    try:
        # Search using pgvector cosine distance
        distance_expr = Transcript.embedding.cosine_distance(query_embedding)
        query = (
            db.query(Transcript, Meeting.title, distance_expr.label("distance"))
            .join(Meeting)
            .filter(Meeting.organization_id == current_user.organization_id)
            .order_by(distance_expr)
            .limit(search_input.limit)
        )

        for segment, title, distance in query:
            # Cosine similarity score
            score = 1.0 - float(distance) if distance is not None else 0.8
            score = max(0.0, min(1.0, score))

            results.append(
                SearchResultItem(
                    meeting_id=segment.meeting_id,
                    meeting_title=title,
                    segment_id=segment.id,
                    speaker_tag=segment.speaker_tag,
                    text=segment.text,
                    start_ms=segment.start_ms,
                    end_ms=segment.end_ms,
                    score=score,
                )
            )
    except Exception as e:
        # Fallback to simple SQL ILIKE search
        segments = (
            db.query(Transcript, Meeting.title)
            .join(Meeting)
            .filter(
                Meeting.organization_id == current_user.organization_id,
                Transcript.text.ilike(f"%{search_input.query}%"),
            )
            .limit(search_input.limit)
            .all()
        )

        for segment, title in segments:
            results.append(
                SearchResultItem(
                    meeting_id=segment.meeting_id,
                    meeting_title=title,
                    segment_id=segment.id,
                    speaker_tag=segment.speaker_tag,
                    text=segment.text,
                    start_ms=segment.start_ms,
                    end_ms=segment.end_ms,
                    score=0.75,
                )
            )

    return results


def is_high_level_question(question: str) -> bool:
    import re

    # Normalize question: remove non-alphanumeric chars (except spaces) and lowercase it
    q = re.sub(r"[^\w\s]", "", question.lower().strip())

    high_level_phrases = [
        "what is this meeting about",
        "what was this meeting about",
        "main point",
        "main objective",
        "purpose of the meeting",
        "purpose of this meeting",
        "overall discussion",
        "give me an overview",
        "summarize this meeting",
        "summarize the meeting",
        "what happened in this meeting",
        "what happened in the meeting",
        "key discussion topics",
        "what was the focus",
        "meeting summary",
        "general summary",
        "overall summary",
        "executive summary",
        "high level summary",
    ]

    # Check for direct phrase matches
    for phrase in high_level_phrases:
        if phrase in q:
            return True

    # Also check if it's asking for summary / overview / purpose in a short query
    words = q.split()
    if len(words) <= 5:
        short_keywords = {
            "summary",
            "overview",
            "purpose",
            "objective",
            "theme",
            "agenda",
            "focus",
        }
        if any(w in short_keywords for w in words):
            return True

    return False


@router.post("/chat", response_model=ChatResponse)
def chat_with_meetings(
    chat_input: ChatQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    RAG chat endpoint. Searches relevant segments and sends them to OpenRouterService
    to generate an answer.
    """
    if not chat_input.question.strip():
        return ChatResponse(
            answer="Please provide a valid question.", confidence_score=0.0, sources=[]
        )

    # Load past chat history for context (up to last 10 messages)
    chat_history = []
    if chat_input.meeting_id:
        chat_history_db = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.meeting_id == chat_input.meeting_id,
                ChatMessage.user_id == current_user.id,
            )
            .order_by(ChatMessage.created_at.asc())
            .limit(10)
            .all()
        )
        chat_history = [{"role": msg.role, "text": msg.text} for msg in chat_history_db]

    # Save user question in DB
    if chat_input.meeting_id:
        user_msg = ChatMessage(
            meeting_id=chat_input.meeting_id,
            user_id=current_user.id,
            role="user",
            text=chat_input.question.strip(),
        )
        db.add(user_msg)
        db.commit()

    is_high_level = False
    if chat_input.meeting_id:
        is_high_level = is_high_level_question(chat_input.question)

    sources = []
    context_str = ""
    system_prompt_override = None

    if is_high_level:
        # Retrieve overall meeting summary and details
        meeting = (
            db.query(Meeting)
            .filter(
                Meeting.id == chat_input.meeting_id,
                Meeting.organization_id == current_user.organization_id,
            )
            .first()
        )
        if meeting:
            has_summary = bool(
                meeting.executive_summary
                or meeting.one_minute_read
                or meeting.sentiment_summary
            )
            if has_summary:
                # Construct overall meeting context from summary metadata fields
                context_parts = [f"Meeting Title: {meeting.title}"]
                if meeting.executive_summary:
                    context_parts.append(
                        f"Executive Summary:\n{meeting.executive_summary}"
                    )
                if meeting.one_minute_read:
                    context_parts.append(f"One Minute Read:\n{meeting.one_minute_read}")
                if meeting.sentiment_summary:
                    context_parts.append(
                        f"Sentiment & Tone:\n{meeting.sentiment_summary}"
                    )

                # Add decisions
                if meeting.decisions:
                    decisions_str = "\n".join(
                        [
                            f"- {d.decision_text} (Rationale: {d.rationale})"
                            for d in meeting.decisions
                        ]
                    )
                    context_parts.append(f"Decisions Made:\n{decisions_str}")

                # Add action items
                if meeting.action_items:
                    action_items_str = "\n".join(
                        [
                            f"- {a.description} (Assigned to: {a.assigned_to or 'Unassigned'})"
                            for a in meeting.action_items
                        ]
                    )
                    context_parts.append(f"Action Items:\n{action_items_str}")

                # Add risks
                if meeting.risks:
                    risks_str = "\n".join(
                        [
                            f"- {r.risk_text} (Severity: {r.severity}, Mitigation: {r.mitigation})"
                            for r in meeting.risks
                        ]
                    )
                    context_parts.append(f"Risks Discussed:\n{risks_str}")

                # Add questions
                if meeting.questions:
                    questions_str = "\n".join(
                        [f"- {q.question_text}" for q in meeting.questions]
                    )
                    context_parts.append(f"Questions Raised:\n{questions_str}")

                context_str = "\n\n".join(context_parts)
            else:
                # No summary exists: fetch and join multiple transcript segments
                segments = (
                    db.query(Transcript)
                    .filter(Transcript.meeting_id == chat_input.meeting_id)
                    .order_by(Transcript.start_time.asc())
                    .all()
                )
                if segments:
                    context_str = (
                        f"Meeting Title: {meeting.title}\n\nFull Transcript:\n"
                        + "\n".join(
                            [
                                f"[{seg.speaker_tag}]: {seg.text}"
                                for seg in segments[:100]
                            ]
                        )
                    )
                else:
                    context_str = "No transcript or summary available for this meeting."

            # Setup custom high-level system prompt as required by prompt engineering guidelines
            system_prompt_override = (
                "You are an AI Meeting Assistant.\n"
                "When answering questions about the overall meeting, identify the central theme across the ENTIRE meeting instead of focusing on one retrieved sentence.\n"
                "Do not simply repeat the first matching transcript chunk.\n"
                "Synthesize information from all provided context and produce a concise but accurate meeting-level answer."
            )
    else:
        # 1. Retrieve query embedding for specific questions
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.generate_embedding(chat_input.question)

        try:
            distance_expr = Transcript.embedding.cosine_distance(query_embedding)
            query = (
                db.query(Transcript, Meeting.title, distance_expr.label("distance"))
                .join(Meeting)
                .filter(Meeting.organization_id == current_user.organization_id)
            )

            if chat_input.meeting_id:
                query = query.filter(Meeting.id == chat_input.meeting_id)

            query = query.order_by(distance_expr).limit(4)

            # Get meeting summary for context
            meeting_summary = ""
            if chat_input.meeting_id:
                meeting = (
                    db.query(Meeting)
                    .filter(Meeting.id == chat_input.meeting_id)
                    .first()
                )
                if meeting and meeting.executive_summary:
                    meeting_summary = meeting.executive_summary
            context_str = (
                f"Meeting Summary:\n{meeting_summary}\n\nRelevant Retrieved Chunks:\n"
            )

            for segment, title, distance in query:
                score = 1.0 - float(distance) if distance is not None else 0.8
                score = max(0.0, min(1.0, score))

                sources.append(
                    SearchResultItem(
                        meeting_id=segment.meeting_id,
                        meeting_title=title,
                        segment_id=segment.id,
                        speaker_tag=segment.speaker_tag,
                        text=segment.text,
                        start_ms=segment.start_ms,
                        end_ms=segment.end_ms,
                        score=score,
                    )
                )
                context_str += f"[{title}]: {segment.text}\n"
        except Exception:
            # Fallback keyword-based search
            query = (
                db.query(Transcript, Meeting.title)
                .join(Meeting)
                .filter(Meeting.organization_id == current_user.organization_id)
            )
            if chat_input.meeting_id:
                query = query.filter(Meeting.id == chat_input.meeting_id)

            # Simple text matching split
            words = [w.strip() for w in chat_input.question.split() if len(w) > 3]
            if words:
                from sqlalchemy import or_

                filters = [Transcript.text.ilike(f"%{w}%") for w in words]
                query = query.filter(or_(*filters))

            segments = query.limit(4).all()

            # Get meeting summary for context
            meeting_summary = ""
            if chat_input.meeting_id:
                meeting = (
                    db.query(Meeting)
                    .filter(Meeting.id == chat_input.meeting_id)
                    .first()
                )
                if meeting and meeting.executive_summary:
                    meeting_summary = meeting.executive_summary
            context_str = (
                f"Meeting Summary:\n{meeting_summary}\n\nRelevant Retrieved Chunks:\n"
            )

            for segment, title in segments:
                sources.append(
                    SearchResultItem(
                        meeting_id=segment.meeting_id,
                        meeting_title=title,
                        segment_id=segment.id,
                        speaker_tag=segment.speaker_tag,
                        text=segment.text,
                        start_ms=segment.start_ms,
                        end_ms=segment.end_ms,
                        score=0.7,
                    )
                )
                context_str += f"[{title}]: {segment.text}\n"

    # 2. Call OpenRouterService to answer the question using context, chat history and system prompt override
    gemini_service = GeminiService()
    answer = gemini_service.generate_chat_response(
        chat_input.question,
        context_str,
        chat_history=chat_history,
        system_prompt=system_prompt_override,
    )

    # Save assistant answer in DB
    if chat_input.meeting_id:
        assistant_msg = ChatMessage(
            meeting_id=chat_input.meeting_id,
            user_id=current_user.id,
            role="assistant",
            text=answer,
        )
        db.add(assistant_msg)
        db.commit()

    # Calculate simple confidence score based on similarity scores
    confidence = 0.85
    if sources:
        confidence = sum(s.score for s in sources) / len(sources)

    return ChatResponse(answer=answer, confidence_score=confidence, sources=sources)


@router.get("/chat/history", response_model=List[ChatMessageOut])
def get_chat_history(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all past chat messages for a specific meeting of the current user.
    """
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.meeting_id == meeting_id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return messages


# --- Chat Sessions & Streaming APIs ---


@router.post("/meetings/{meeting_id}/chat/new", response_model=ChatSessionOut)
def create_chat_session(
    meeting_id: str,
    session_input: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    session = ChatSession(
        meeting_id=meeting_id,
        user_id=current_user.id,
        title=session_input.title or "New Chat",
        is_archived=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/meetings/{meeting_id}/chat-history", response_model=List[ChatSessionOut])
def get_meeting_chat_history(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.meeting_id == meeting_id,
            ChatSession.user_id == current_user.id,
        )
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.get("/chat/{session_id}", response_model=ChatSessionDetailOut)
def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.patch("/chat/{session_id}/title", response_model=ChatSessionOut)
def update_chat_session_title(
    session_id: str,
    title_input: TitleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session.title = title_input.title
    db.commit()
    db.refresh(session)
    return session


@router.patch("/chat/{session_id}/archive", response_model=ChatSessionOut)
def toggle_chat_session_archive(
    session_id: str,
    archive_input: ArchiveStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session.is_archived = archive_input.is_archived
    db.commit()
    db.refresh(session)
    return session


@router.delete("/chat/{session_id}/messages")
def clear_chat_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.commit()
    return {"message": "Chat session messages cleared successfully"}


@router.post("/chat/{session_id}/message")
def chat_in_session(
    session_id: str,
    chat_input: MessageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if session.is_archived:
        raise HTTPException(
            status_code=400, detail="This chat session is ended/archived."
        )

    question = chat_input.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Please provide a valid question.")

    # 1. Save user question message
    user_msg = ChatMessage(
        meeting_id=session.meeting_id,
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        text=question,
    )
    db.add(user_msg)
    db.commit()

    # 2. Auto-generate title if default
    if session.title == "New Chat" or not session.title.strip():
        try:
            gemini_service = GeminiService()
            new_title = gemini_service.generate_title(question)
            if new_title:
                session.title = new_title
                db.commit()
        except Exception as title_err:
            logger.warning(f"Error auto-generating session title: {title_err}")

    # 3. Determine if high level question
    is_high_level = is_high_level_question(question)

    context_str = ""
    system_prompt_override = None

    if is_high_level:
        # Load context from Cache if available, or build it
        context_str = MeetingContextCache.get_context(session.meeting_id, db)

        system_prompt_override = (
            "You are an AI Meeting Assistant.\n"
            "When answering questions about the overall meeting, identify the central theme across the ENTIRE meeting instead of focusing on one retrieved sentence.\n"
            "Do not simply repeat the first matching transcript chunk.\n"
            "Synthesize information from all provided context and produce a concise but accurate meeting-level answer."
        )
    else:
        # Generate embedding (from cache or new)
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.generate_embedding(question)

        try:
            distance_expr = Transcript.embedding.cosine_distance(query_embedding)
            query = (
                db.query(Transcript, Meeting.title, distance_expr.label("distance"))
                .join(Meeting)
                .filter(Meeting.organization_id == current_user.organization_id)
                .filter(Meeting.id == session.meeting_id)
                .order_by(distance_expr)
                .limit(4)
                .all()
            )

            # Get meeting summary for context
            meeting_summary = ""
            meeting = db.query(Meeting).filter(Meeting.id == session.meeting_id).first()
            if meeting and meeting.executive_summary:
                meeting_summary = meeting.executive_summary

            context_str = (
                f"Meeting Summary:\n{meeting_summary}\n\nRelevant Retrieved Chunks:\n"
            )
            for segment, title, distance in query:
                context_str += f"[{title}]: {segment.text}\n"
        except Exception:
            # Fallback keyword-based search
            query = (
                db.query(Transcript, Meeting.title)
                .join(Meeting)
                .filter(Meeting.organization_id == current_user.organization_id)
                .filter(Meeting.id == session.meeting_id)
            )

            words = [w.strip() for w in question.split() if len(w) > 3]
            if words:
                from sqlalchemy import or_

                filters = [Transcript.text.ilike(f"%{w}%") for w in words]
                query = query.filter(or_(*filters))

            segments = query.limit(4).all()

            # Get meeting summary for context
            meeting_summary = ""
            meeting = db.query(Meeting).filter(Meeting.id == session.meeting_id).first()
            if meeting and meeting.executive_summary:
                meeting_summary = meeting.executive_summary

            context_str = (
                f"Meeting Summary:\n{meeting_summary}\n\nRelevant Retrieved Chunks:\n"
            )
            for segment, title in segments:
                context_str += f"[{title}]: {segment.text}\n"

    # Get last 12 messages (6 exchanges) for chat history
    chat_history_db = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(12)
        .all()
    )
    chat_history = [
        {"role": msg.role, "text": msg.text} for msg in reversed(chat_history_db)
    ]

    # Update updated_at of the session
    session.updated_at = datetime.now()
    db.commit()

    # Define streaming response
    def event_generator():
        gemini_service = GeminiService()
        full_text = ""
        try:
            for token in gemini_service.generate_chat_response_stream(
                question,
                context_str,
                chat_history=chat_history,
                system_prompt=system_prompt_override,
            ):
                full_text += token
                yield token
        finally:
            if full_text.strip():
                # Save assistant response using a fresh thread-safe session
                db_gen = SessionLocal()
                try:
                    assistant_msg = ChatMessage(
                        meeting_id=session.meeting_id,
                        user_id=current_user.id,
                        session_id=session_id,
                        role="assistant",
                        text=full_text,
                    )
                    db_gen.add(assistant_msg)
                    db_gen.commit()
                except Exception as save_err:
                    logger.error(
                        f"Error saving streamed assistant response: {save_err}"
                    )
                finally:
                    db_gen.close()

    return StreamingResponse(event_generator(), media_type="text/plain")
