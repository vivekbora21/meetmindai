import os
import uuid
import logging
import time
import math
import json
from datetime import datetime
from typing import List, Dict, Any, Generator, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from openai import OpenAI

from app.models.models import Meeting, MeetingChunk, Transcript, User, ChatMessage

logger = logging.getLogger(__name__)

# Cache models locally so they are singletons
_embedding_model = None
_reranker_model = None

RAG_SYSTEM_PROMPT = """You are an enterprise-grade AI Meeting Assistant.
Your task is to answer user questions about meetings they have attended based ONLY on the provided context chunks.

CRITICAL RULES:
1. Answer the question using ONLY the provided meeting transcripts/context.
2. If the retrieved context does not contain the answer, reply exactly with: "I could not find that information in your meetings."
3. Never hallucinate, assume, extrapolate, or invent details.
4. Never invent dates, tasks, deadlines, decisions, or assignments.
5. Always ground your answer with references to the meetings provided in the context.
6. Present your answer clearly in Markdown format (use bullet points, tables, lists, and bold text as appropriate).

Provided Context (format: [Meeting Title | Date | Speaker | Timestamp | Chunk ID] Transcript text):
{context}
"""

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading BAAI/bge-small-en-v1.5 model...")
            # Load local sentence-transformers model
            _embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
            logger.info("Successfully loaded BAAI/bge-small-en-v1.5 model")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer model BAAI/bge-small-en-v1.5: {e}")
    return _embedding_model

def get_reranker_model():
    global _reranker_model
    if _reranker_model is None:
        try:
            from sentence_transformers import CrossEncoder
            logger.info("Loading BAAI/bge-reranker-base model...")
            _reranker_model = CrossEncoder("BAAI/bge-reranker-base")
            logger.info("Successfully loaded BAAI/bge-reranker-base model")
        except Exception as e:
            logger.error(f"Failed to load cross encoder model BAAI/bge-reranker-base: {e}")
    return _reranker_model


class RAGService:
    @staticmethod
    def count_tokens(text: str) -> int:
        """Estimate the token count of a given string using words count."""
        return int(len(text.split()) * 1.3)

    @staticmethod
    def format_time(seconds: float) -> str:
        """Format seconds into MM:SS format."""
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins:02d}:{secs:02d}"

    @classmethod
    def chunk_transcript(cls, segments: List[Transcript]) -> List[Dict[str, Any]]:
        """
        Group segments chronologically into chunks.
        Target size: 400-600 tokens
        Overlap: 75 tokens
        Preserves speaker boundaries (we do not split segment text)
        Preserves timestamps
        """
        if not segments:
            return []

        chunks = []
        n = len(segments)
        
        # We will loop using indices to support clean sliding window overlap
        start_idx = 0
        chunk_index = 0

        while start_idx < n:
            current_segments = []
            current_tokens = 0
            end_idx = start_idx
            
            # Fill the chunk up to a maximum of 600 tokens
            while end_idx < n:
                seg = segments[end_idx]
                speaker_name = seg.speaker_tag
                formatted_seg = f"[{cls.format_time(seg.start_time)}] {speaker_name}: {seg.text}\n"
                seg_tokens = cls.count_tokens(formatted_seg)
                
                # If adding this segment pushes us over 600 tokens and we already have content, we stop
                if current_tokens + seg_tokens > 600 and current_segments:
                    break
                
                current_segments.append((seg, formatted_seg, seg_tokens))
                current_tokens += seg_tokens
                end_idx += 1
                
                # If we've reached a good size (between 400-600 tokens), we can stop
                if current_tokens >= 400:
                    break

            if not current_segments:
                break

            # Build the chunk details
            chunk_text = "".join(item[1] for item in current_segments)
            t_start = current_segments[0][0].start_time
            t_end = current_segments[-1][0].end_time
            
            # Collect unique speakers in this chunk
            speakers = list(dict.fromkeys(item[0].speaker_tag for item in current_segments))
            speaker_str = ", ".join(speakers)

            chunks.append({
                "chunk_index": chunk_index,
                "chunk_text": chunk_text,
                "speaker": speaker_str,
                "timestamp_start": t_start,
                "timestamp_end": t_end
            })
            chunk_index += 1

            # If we've processed all segments, break
            if end_idx >= n:
                break

            # Calculate overlap of ~75 tokens from the end of current_segments
            overlap_tokens = 0
            overlap_count = 0
            for k in range(len(current_segments) - 1, -1, -1):
                seg_tok = current_segments[k][2]
                if overlap_tokens + seg_tok > 75:
                    break
                overlap_tokens += seg_tok
                overlap_count += 1

            # Ensure we make forward progress by at least 1 segment
            next_start_idx = end_idx - overlap_count
            if next_start_idx <= start_idx:
                next_start_idx = start_idx + 1
            
            start_idx = next_start_idx

        return chunks

    @classmethod
    def index_meeting(cls, db: Session, meeting_id: str) -> bool:
        """
        Runs the chunking and embedding pipeline for a meeting's transcripts.
        """
        logger.info(f"RAGService | Ingesting and indexing meeting: {meeting_id}")
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"RAGService | Meeting {meeting_id} not found")
            return False

        # Update status
        meeting.embedding_status = "PROCESSING"
        db.commit()

        try:
            # Delete any existing chunks
            db.query(MeetingChunk).filter(MeetingChunk.meeting_id == meeting_id).delete()
            db.commit()

            # Retrieve transcripts
            segments = (
                db.query(Transcript)
                .filter(Transcript.meeting_id == meeting_id)
                .order_by(Transcript.start_time.asc())
                .all()
            )

            if not segments:
                logger.warning(f"RAGService | No transcripts found for meeting: {meeting_id}")
                meeting.embedding_status = "SUCCESS"
                db.commit()
                return True

            # Perform intelligent chunking
            chunks = cls.chunk_transcript(segments)
            logger.info(f"RAGService | Split transcript into {len(chunks)} chunks.")

            # Load model
            model = get_embedding_model()

            for chunk_data in chunks:
                chunk_text = chunk_data["chunk_text"]
                embedding = None
                
                # Generate embedding with BAAI/bge-small-en-v1.5
                if model is not None:
                    try:
                        embedding = model.encode(chunk_text, convert_to_numpy=True).tolist()
                    except Exception as e:
                        logger.error(f"RAGService | Error generating embedding: {e}")
                
                # Fallback to random embedding if model is unavailable
                if embedding is None:
                    # dimension 384 for bge-small-en-v1.5
                    embedding = [0.0] * 384

                chunk = MeetingChunk(
                    meeting_id=meeting_id,
                    chunk_index=chunk_data["chunk_index"],
                    chunk_text=chunk_text,
                    embedding=embedding,
                    speaker=chunk_data["speaker"],
                    timestamp_start=chunk_data["timestamp_start"],
                    timestamp_end=chunk_data["timestamp_end"]
                )
                db.add(chunk)
            
            meeting.embedding_status = "SUCCESS"
            db.commit()
            logger.info(f"RAGService | Successfully indexed meeting: {meeting_id}")
            return True

        except Exception as e:
            logger.error(f"RAGService | Failed to index meeting {meeting_id}: {e}", exc_info=True)
            meeting.embedding_status = "FAILED"
            db.commit()
            return False

    @classmethod
    def get_llm_client_and_model(cls) -> Tuple[OpenAI, str, str]:
        """
        Instantiates and returns the configured LLM client, model name, and provider identifier.
        """
        from app.services.llm.factory import LLMFactory
        provider_instance = LLMFactory.get_provider()
        return provider_instance.client, provider_instance.model_name, provider_instance.provider_name

    @classmethod
    def rrf_merge(cls, vector_list: List[MeetingChunk], keyword_list: List[MeetingChunk], k: int = 60) -> List[MeetingChunk]:
        """
        Merge vector similarity and keyword search results using Reciprocal Rank Fusion (RRF).
        """
        rrf_scores = {}
        
        for rank, chunk in enumerate(vector_list):
            rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (k + rank + 1))
            
        for rank, chunk in enumerate(keyword_list):
            rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (k + rank + 1))
            
        all_chunks = {c.id: c for c in vector_list + keyword_list}
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        return [all_chunks[cid] for cid in sorted_ids]

    @classmethod
    def search_chunks(
        cls,
        db: Session,
        current_user: User,
        question: str,
        filters: Dict[str, Any] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Performs hybrid vector search + metadata filters + cross-encoder re-ranking.
        """
        if not filters:
            filters = {}

        # 1. Generate query embedding
        query_embedding = None
        emb_model = get_embedding_model()
        if emb_model is not None:
            try:
                query_embedding = emb_model.encode(question, convert_to_numpy=True).tolist()
            except Exception as e:
                logger.error(f"RAGService | Error generating query embedding: {e}")

        # 2. Build SQLAlchemy base query with joins and organization filters
        base_query = db.query(MeetingChunk).join(Meeting).filter(
            Meeting.organization_id == current_user.organization_id
        )

        # Apply platform filter
        if filters.get("platform"):
            base_query = base_query.filter(Meeting.platform.ilike(f"%{filters['platform']}%"))

        # Apply date filters
        if filters.get("date_start"):
            try:
                d_start = datetime.strptime(filters["date_start"], "%Y-%m-%d")
                base_query = base_query.filter(Meeting.meeting_date >= d_start)
            except ValueError:
                pass
        if filters.get("date_end"):
            try:
                d_end = datetime.strptime(filters["date_end"], "%Y-%m-%d")
                base_query = base_query.filter(Meeting.meeting_date <= d_end)
            except ValueError:
                pass

        # Apply specific meeting filter
        if filters.get("meeting_id"):
            base_query = base_query.filter(Meeting.id == filters["meeting_id"])

        # Apply project / title match filter
        if filters.get("project"):
            base_query = base_query.filter(
                or_(
                    Meeting.title.ilike(f"%{filters['project']}%"),
                    MeetingChunk.chunk_text.ilike(f"%{filters['project']}%")
                )
            )

        # Apply participants/speakers filter
        if filters.get("participants"):
            parts = filters["participants"]
            if isinstance(parts, list) and parts:
                p_filters = [MeetingChunk.speaker.ilike(f"%{p}%") for p in parts]
                base_query = base_query.filter(or_(*p_filters))

        # 3. Retrieve Candidate list using Hybrid Search
        vector_results = []
        if query_embedding is not None:
            try:
                from pgvector.sqlalchemy import Vector
                distance_expr = MeetingChunk.embedding.cosine_distance(query_embedding)
                vector_results = (
                    base_query.order_by(distance_expr)
                    .limit(limit * 2)
                    .all()
                )
            except Exception as e:
                logger.error(f"RAGService | Cosine distance search failed: {e}")

        # Keyword matching search (fallback or hybrid component)
        keyword_results = []
        words = [w.strip() for w in question.split() if len(w) > 3]
        if words:
            kw_filters = [MeetingChunk.chunk_text.ilike(f"%{w}%") for w in words]
            keyword_results = (
                base_query.filter(or_(*kw_filters))
                .limit(limit * 2)
                .all()
            )

        # Merge results using Reciprocal Rank Fusion
        merged_chunks = cls.rrf_merge(vector_results, keyword_results)

        # 4. Format chunks for re-ranking
        chunk_items = []
        for chunk in merged_chunks:
            chunk_items.append({
                "chunk_id": chunk.id,
                "meeting_id": chunk.meeting_id,
                "meeting_title": chunk.meeting.title,
                "meeting_date": chunk.meeting.meeting_date.strftime("%Y-%m-%d") if chunk.meeting.meeting_date else "Unknown Date",
                "platform": chunk.meeting.platform or "Unknown Platform",
                "chunk_index": chunk.chunk_index,
                "chunk_text": chunk.chunk_text,
                "speaker": chunk.speaker or "Unknown",
                "timestamp_start": chunk.timestamp_start or 0.0,
                "timestamp_end": chunk.timestamp_end or 0.0,
                "vector_score": 1.0
            })

        # 5. Re-rank results with CrossEncoder (bge-reranker-base)
        reranker = get_reranker_model()
        if reranker is not None and chunk_items:
            try:
                pairs = [(question, item["chunk_text"]) for item in chunk_items]
                scores = reranker.predict(pairs)
                for score, item in zip(scores, chunk_items):
                    item["rerank_score"] = float(score)
                # Sort descending by re-ranker score
                chunk_items.sort(key=lambda x: x["rerank_score"], reverse=True)
            except Exception as e:
                logger.error(f"RAGService | Error in cross-encoder re-ranking: {e}")
                # Fallback to vector/rrf list order
                for idx, item in enumerate(chunk_items):
                    item["rerank_score"] = 1.0 / (idx + 1)
        else:
            # Fallback score
            for idx, item in enumerate(chunk_items):
                item["rerank_score"] = 1.0 / (idx + 1)

        return chunk_items[:limit]

    @classmethod
    def get_suggested_questions(cls, chunks: List[Dict[str, Any]]) -> List[str]:
        """Generate smart suggested follow-up questions from top retrieved chunks."""
        joined_text = " ".join(item["chunk_text"] for item in chunks).lower()
        suggestions = []
        
        if "action" in joined_text or "task" in joined_text or "todo" in joined_text:
            suggestions.append("What action items or next steps were assigned and to whom?")
        if "deadline" in joined_text or "due" in joined_text or "date" in joined_text or "by when" in joined_text:
            suggestions.append("What are the upcoming project deadlines or delivery schedules?")
        if "decision" in joined_text or "agreed" in joined_text or "decided" in joined_text:
            suggestions.append("What major decisions were agreed upon during the meeting?")
        if "risk" in joined_text or "issue" in joined_text or "block" in joined_text or "concern" in joined_text:
            suggestions.append("What risks or blockers were discussed, and how will they be mitigated?")
            
        # Ensure we have at least 3 smart questions
        default_suggestions = [
            "What were the key topics discussed in these meetings?",
            "What were the main decisions made?",
            "Can you summarize the action items and owners?"
        ]
        
        for ds in default_suggestions:
            if ds not in suggestions:
                suggestions.append(ds)
                
        return suggestions[:4]

    @classmethod
    def chat_answer(
        cls,
        db: Session,
        current_user: User,
        question: str,
        filters: Dict[str, Any] = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Non-streaming RAG chat answer generation.
        """
        # 1. Retrieve top chunks
        sources = cls.search_chunks(db, current_user, question, filters=filters, limit=6)
        
        # 2. Format context for LLM
        context_parts = []
        for idx, src in enumerate(sources):
            header = f"[{idx + 1}] Meeting: '{src['meeting_title']}' | Date: {src['meeting_date']} | Speaker: {src['speaker']} | Time: {cls.format_time(src['timestamp_start'])}-{cls.format_time(src['timestamp_end'])}"
            context_parts.append(f"{header}\nTranscript: {src['chunk_text']}")
            
        context_str = "\n\n".join(context_parts)
        
        # 3. Load chat history if session_id is provided
        history_msgs = []
        if session_id:
            db_history = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.asc())
                .limit(10)
                .all()
            )
            for m in db_history:
                history_msgs.append({"role": m.role, "content": m.text})
                
        # 4. Construct system prompt
        system_instruction = RAG_SYSTEM_PROMPT.format(context=context_str)
        
        messages = [{"role": "system", "content": system_instruction}]
        for m in history_msgs:
            messages.append({"role": m["role"], "content": m["content"]})
        messages.append({"role": "user", "content": question})
        
        # 5. Call LLM
        from app.services.llm.factory import LLMFactory
        provider_instance = LLMFactory.get_provider()
        model = provider_instance.model_name
        provider = provider_instance.provider_name
        
        logger.info(f"RAGService | Invoking LLM: {model} ({provider}) for RAG Chat")
        
        try:
            response = provider_instance.generate_completion(
                messages=messages,
                temperature=0.0
            )
            # Re-read active model and provider name in case of cascade model switch
            model = provider_instance.model_name
            provider = provider_instance.provider_name
            answer = response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"RAGService | LLM generation error: {e}")
            answer = "I encountered an error while retrieving your answer. Please try again."

        # Confidence score
        confidence = 0.85
        if sources:
            scores = [src.get("rerank_score", 0.0) for src in sources]
            avg_score = sum(scores) / len(scores)
            confidence = float(1.0 / (1.0 + math.exp(-avg_score))) if provider != "ollama" else 0.8
            confidence = max(0.1, min(0.99, confidence))
            
        suggested = cls.get_suggested_questions(sources)
        
        return {
            "answer": answer,
            "confidence_score": confidence,
            "sources": sources,
            "suggested_questions": suggested
        }

    @classmethod
    def chat_answer_stream(
        cls,
        db: Session,
        current_user: User,
        question: str,
        filters: Dict[str, Any] = None,
        session_id: str = None
    ) -> Generator[str, None, None]:
        """
        Streaming version yielding text.
        At the end of the stream we append metadata separator and the JSON representation of sources.
        """
        # 1. Retrieve top chunks
        sources = cls.search_chunks(db, current_user, question, filters=filters, limit=6)
        
        # 2. Format context for LLM
        context_parts = []
        for idx, src in enumerate(sources):
            header = f"[{idx + 1}] Meeting: '{src['meeting_title']}' | Date: {src['meeting_date']} | Speaker: {src['speaker']} | Time: {cls.format_time(src['timestamp_start'])}-{cls.format_time(src['timestamp_end'])}"
            context_parts.append(f"{header}\nTranscript: {src['chunk_text']}")
            
        context_str = "\n\n".join(context_parts)
        
        # 3. Load chat history if session_id is provided
        history_msgs = []
        if session_id:
            db_history = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.asc())
                .limit(10)
                .all()
            )
            for m in db_history:
                history_msgs.append({"role": m.role, "content": m.text})
                
        # 4. Construct system prompt
        system_instruction = RAG_SYSTEM_PROMPT.format(context=context_str)
        
        messages = [{"role": "system", "content": system_instruction}]
        for m in history_msgs:
            messages.append({"role": m["role"], "content": m["content"]})
        messages.append({"role": "user", "content": question})
        
        # 5. Call LLM
        from app.services.llm.factory import LLMFactory
        provider_instance = LLMFactory.get_provider()
        model = provider_instance.model_name
        provider = provider_instance.provider_name
        
        logger.info(f"RAGService | Invoking streaming LLM: {model} ({provider}) for RAG Chat")
        
        try:
            stream = provider_instance.generate_completion_stream(
                messages=messages,
                temperature=0.0
            )
            # Re-read active model and provider name in case of cascade model switch
            model = provider_instance.model_name
            provider = provider_instance.provider_name
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield token
        except Exception as e:
            logger.error(f"RAGService | LLM streaming error: {e}")
            yield "I encountered an error while streaming the response."

        confidence = 0.85
        if sources:
            scores = [src.get("rerank_score", 0.0) for src in sources]
            avg_score = sum(scores) / len(scores)
            confidence = float(1.0 / (1.0 + math.exp(-avg_score))) if provider != "ollama" else 0.8
            confidence = max(0.1, min(0.99, confidence))
            
        suggested = cls.get_suggested_questions(sources)
        
        metadata = {
            "confidence_score": confidence,
            "sources": sources,
            "suggested_questions": suggested
        }
        
        yield "\n\n__METADATA_SEPARATOR__\n" + json.dumps(metadata)
