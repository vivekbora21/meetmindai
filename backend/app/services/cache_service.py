import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MeetingContextCache:
    _cache: Dict[str, str] = {}

    @classmethod
    def get_context(cls, meeting_id: str, db) -> str:
        """
        Retrieves the cached context string for a meeting, or constructs it from the database and caches it.
        """
        if meeting_id in cls._cache:
            logger.info(f"MeetingContextCache | Cache hit for meeting: {meeting_id}")
            return cls._cache[meeting_id]

        logger.info(f"MeetingContextCache | Cache miss for meeting: {meeting_id}. Loading from database...")
        from app.models.models import Meeting
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return ""

        context_parts = [f"Meeting Title: {meeting.title}"]
        if meeting.executive_summary:
            context_parts.append(f"Executive Summary:\n{meeting.executive_summary}")
        if meeting.one_minute_read:
            context_parts.append(f"One Minute Read:\n{meeting.one_minute_read}")
        if meeting.sentiment_summary:
            context_parts.append(f"Sentiment & Tone:\n{meeting.sentiment_summary}")
        
        # Add decisions
        if meeting.decisions:
            decisions_str = "\n".join([f"- {d.decision_text} (Rationale: {d.rationale})" for d in meeting.decisions])
            context_parts.append(f"Decisions Made:\n{decisions_str}")
        
        # Add action items
        if meeting.action_items:
            action_items_str = "\n".join([f"- {a.description} (Assigned to: {a.assigned_to or 'Unassigned'})" for a in meeting.action_items])
            context_parts.append(f"Action Items:\n{action_items_str}")
        
        # Add risks
        if meeting.risks:
            risks_str = "\n".join([f"- {r.risk_text} (Severity: {r.severity}, Mitigation: {r.mitigation})" for r in meeting.risks])
            context_parts.append(f"Risks Discussed:\n{risks_str}")
        
        # Add questions
        if meeting.questions:
            questions_str = "\n".join([f"- {q.question_text}" for q in meeting.questions])
            context_parts.append(f"Questions Raised:\n{questions_str}")

        context_str = "\n\n".join(context_parts)
        cls._cache[meeting_id] = context_str
        return context_str

    @classmethod
    def invalidate(cls, meeting_id: str):
        """
        Invalidates/clears the cache entry for a specific meeting.
        """
        if meeting_id in cls._cache:
            logger.info(f"MeetingContextCache | Invalidating cache for meeting: {meeting_id}")
            cls._cache.pop(meeting_id, None)
