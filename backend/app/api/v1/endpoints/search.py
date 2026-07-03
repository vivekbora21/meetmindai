from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.models import Meeting, User, TranscriptSegment
from app.api.v1.endpoints.auth import get_current_user
from app.services.embedding_service import EmbeddingService
from app.services.openrouter_service import OpenRouterService

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
        distance_expr = TranscriptSegment.embedding.cosine_distance(query_embedding)
        query = (
            db.query(TranscriptSegment, Meeting.title, distance_expr.label("distance"))
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
            db.query(TranscriptSegment, Meeting.title)
            .join(Meeting)
            .filter(
                Meeting.organization_id == current_user.organization_id,
                TranscriptSegment.text.ilike(f"%{search_input.query}%"),
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

    # 1. Retrieve query embedding
    embedding_service = EmbeddingService()
    query_embedding = embedding_service.generate_embedding(chat_input.question)

    sources = []
    context_str = ""

    try:
        distance_expr = TranscriptSegment.embedding.cosine_distance(query_embedding)
        query = (
            db.query(TranscriptSegment, Meeting.title, distance_expr.label("distance"))
            .join(Meeting)
            .filter(Meeting.organization_id == current_user.organization_id)
        )

        if chat_input.meeting_id:
            query = query.filter(Meeting.id == chat_input.meeting_id)

        query = query.order_by(distance_expr).limit(4)

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
            db.query(TranscriptSegment, Meeting.title)
            .join(Meeting)
            .filter(Meeting.organization_id == current_user.organization_id)
        )
        if chat_input.meeting_id:
            query = query.filter(Meeting.id == chat_input.meeting_id)

        # Simple text matching split
        words = [w.strip() for w in chat_input.question.split() if len(w) > 3]
        if words:
            from sqlalchemy import or_

            filters = [TranscriptSegment.text.ilike(f"%{w}%") for w in words]
            query = query.filter(or_(*filters))

        segments = query.limit(4).all()
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

    # 2. Call OpenRouterService to answer the question using the retrieved context
    openrouter_service = OpenRouterService()
    answer = openrouter_service.generate_answer(chat_input.question, context_str)

    # Calculate simple confidence score based on similarity scores
    confidence = 0.85
    if sources:
        confidence = sum(s.score for s in sources) / len(sources)

    return ChatResponse(answer=answer, confidence_score=confidence, sources=sources)
