from datetime import datetime
from typing import List, Optional, Dict, Any
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db, SessionLocal
from app.models.models import Meeting, User, ChatMessage, ChatSession
from app.helpers.auth import get_current_user
from app.services.ai.rag_service import RAGService
from app.tasks.meeting_tasks import generate_embeddings
from app.schemas.ai import (
    ChatFilter,
    WorkspaceChatQuery,
    ManualIndexQuery,
    WorkspaceChatResponse,
    ChatSessionOut,
    RegenerateQuery,
)

logger = logging.getLogger(__name__)

router = APIRouter()
meeting_router = APIRouter()


@router.post("/chat")
def chat_with_workspace(
    query: WorkspaceChatQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Enterprise RAG pipeline chat completions across all meetings.
    Supports filters and conversation history.
    """
    question = query.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Please provide a valid question.")

    session_id = query.session_id

    # 1. Create session if none or new
    if not session_id or session_id == "new":
        session = ChatSession(
            title="New Workspace Chat",
            user_id=current_user.id,
            meeting_id=None,
            is_archived=False,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    else:
        # Check session exists
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id, ChatSession.user_id == current_user.id
            )
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

    # 2. Save user message to database
    user_msg = ChatMessage(
        meeting_id=None,
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        text=question,
    )
    db.add(user_msg)
    db.commit()

    filters_dict = query.filters.model_dump() if query.filters else None

    # Update updated_at of the session
    session.updated_at = datetime.now()
    db.commit()

    # 3. Stream or return JSON
    if query.stream:

        def stream_response():
            full_text = ""
            # Yield the session ID prefix so the client knows it instantly
            yield f"__SESSION_ID__:{session_id}\n"

            for token in RAGService.chat_answer_stream(
                db, current_user, question, filters=filters_dict, session_id=session_id
            ):
                if "__METADATA_SEPARATOR__" in token:
                    yield token
                else:
                    full_text += token
                    yield token

            # Save assistant response
            if full_text.strip():
                db_gen = SessionLocal()
                try:
                    assistant_msg = ChatMessage(
                        meeting_id=None,
                        user_id=current_user.id,
                        session_id=session_id,
                        role="assistant",
                        text=full_text,
                    )
                    db_gen.add(assistant_msg)

                    # Update session title if default
                    session_db = (
                        db_gen.query(ChatSession)
                        .filter(ChatSession.id == session_id)
                        .first()
                    )
                    if session_db and (
                        session_db.title == "New Workspace Chat"
                        or not session_db.title.strip()
                    ):
                        try:
                            from app.services.ai.gemini_service import GeminiService

                            new_title = GeminiService().generate_title(question)
                            if new_title:
                                session_db.title = new_title
                        except Exception as e:
                            logger.warning(f"Error auto-updating session title: {e}")
                    db_gen.commit()
                except Exception as save_err:
                    logger.error(
                        f"Error saving streamed assistant response: {save_err}"
                    )
                finally:
                    db_gen.close()

        return StreamingResponse(stream_response(), media_type="text/plain")
    else:
        # Non-streaming
        res = RAGService.chat_answer(
            db, current_user, question, filters=filters_dict, session_id=session_id
        )

        # Save assistant message
        assistant_msg = ChatMessage(
            meeting_id=None,
            user_id=current_user.id,
            session_id=session_id,
            role="assistant",
            text=res["answer"],
        )
        db.add(assistant_msg)

        # Update session title if default
        if session.title == "New Workspace Chat" or not session.title.strip():
            try:
                from app.services.ai.gemini_service import GeminiService

                new_title = GeminiService().generate_title(question)
                if new_title:
                    session.title = new_title
            except Exception:
                pass

        db.commit()

        return WorkspaceChatResponse(
            answer=res["answer"],
            confidence_score=res["confidence_score"],
            sources=res["sources"],
            suggested_questions=res["suggested_questions"],
            session_id=session_id,
        )


@meeting_router.post("/index")
def trigger_manual_indexing(
    query: ManualIndexQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually triggers (or retries) the RAG indexing pipeline for a specific meeting.
    """
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == query.meeting_id,
            Meeting.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Queue task on Celery
    generate_embeddings.delay(query.meeting_id)
    return {"message": "Meeting indexing queued successfully", "status": "processing"}


@router.get("/history", response_model=List[ChatSessionOut])
def get_workspace_history(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retrieve list of past workspace chat sessions.
    """
    sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == current_user.id, ChatSession.meeting_id.is_(None)
        )
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.delete("/history")
def clear_workspace_history(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Deletes all workspace chat sessions for the logged-in user.
    """
    db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id, ChatSession.meeting_id.is_(None)
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Workspace chat history cleared successfully"}


@router.post("/regenerate")
def regenerate_last_message(
    query: RegenerateQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-generates the last assistant response for a given session.
    """
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == query.session_id, ChatSession.user_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == query.session_id)
        .order_by(ChatMessage.created_at.desc())
        .all()
    )

    last_user_msg = None
    for m in messages:
        if m.role == "user":
            last_user_msg = m
            break

    if not last_user_msg:
        raise HTTPException(
            status_code=400, detail="No user message found to regenerate"
        )

    # Delete assistant messages after this user message
    for m in messages:
        if m.created_at > last_user_msg.created_at:
            db.delete(m)
    db.commit()

    question = last_user_msg.text
    filters_dict = query.filters.model_dump() if query.filters else None

    session.updated_at = datetime.now()
    db.commit()

    if query.stream:

        def stream_response():
            full_text = ""
            for token in RAGService.chat_answer_stream(
                db,
                current_user,
                question,
                filters=filters_dict,
                session_id=query.session_id,
            ):
                if "__METADATA_SEPARATOR__" in token:
                    yield token
                else:
                    full_text += token
                    yield token

            if full_text.strip():
                db_gen = SessionLocal()
                try:
                    assistant_msg = ChatMessage(
                        meeting_id=None,
                        user_id=current_user.id,
                        session_id=query.session_id,
                        role="assistant",
                        text=full_text,
                    )
                    db_gen.add(assistant_msg)
                    db_gen.commit()
                except Exception as save_err:
                    logger.error(f"Error saving regenerated response: {save_err}")
                finally:
                    db_gen.close()

        return StreamingResponse(stream_response(), media_type="text/plain")
    else:
        res = RAGService.chat_answer(
            db,
            current_user,
            question,
            filters=filters_dict,
            session_id=query.session_id,
        )
        assistant_msg = ChatMessage(
            meeting_id=None,
            user_id=current_user.id,
            session_id=query.session_id,
            role="assistant",
            text=res["answer"],
        )
        db.add(assistant_msg)
        db.commit()

        return WorkspaceChatResponse(
            answer=res["answer"],
            confidence_score=res["confidence_score"],
            sources=res["sources"],
            suggested_questions=res["suggested_questions"],
            session_id=query.session_id,
        )
