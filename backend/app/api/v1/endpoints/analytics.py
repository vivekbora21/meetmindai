from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.models import Meeting, ActionItem, Decision, Risk, User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class AnalyticsOverview(BaseModel):
    total_meetings: int
    completed_action_items: int
    pending_action_items: int
    total_decisions: int
    active_risks: int
    productivity_score: int  # Calculated metric
    decision_velocity: float  # Average decisions per meeting


class SpeakerMetric(BaseModel):
    name: str
    minutes_spoken: float
    percentage: float


class TopicMetric(BaseModel):
    topic: str
    count: int


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Retrieve tenant aggregate statistics
    meetings_count = (
        db.query(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .count()
    )

    total_actions = (
        db.query(ActionItem)
        .join(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .count()
    )

    completed_actions = (
        db.query(ActionItem)
        .join(Meeting)
        .filter(
            Meeting.organization_id == current_user.organization_id,
            ActionItem.status == "Completed",
        )
        .count()
    )

    decisions_count = (
        db.query(Decision)
        .join(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .count()
    )

    risks_count = (
        db.query(Risk)
        .join(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .count()
    )

    pending_actions = total_actions - completed_actions

    # Calculate actual productivity score based on completed action items ratio
    prod_score = (
        int((completed_actions / total_actions) * 100) if total_actions > 0 else 100
    )
    decision_vel = (
        round(decisions_count / meetings_count, 1) if meetings_count > 0 else 0.0
    )

    return AnalyticsOverview(
        total_meetings=meetings_count,
        completed_action_items=completed_actions,
        pending_action_items=pending_actions,
        total_decisions=decisions_count,
        active_risks=risks_count,
        productivity_score=prod_score,
        decision_velocity=decision_vel,
    )


@router.get("/speakers", response_model=List[SpeakerMetric])
def get_speaker_analytics(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Fetch actual speaker metrics from database
    meetings = (
        db.query(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .all()
    )
    meeting_ids = [m.id for m in meetings]

    if not meeting_ids:
        return []

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id.in_(meeting_ids))
        .all()
    )
    if not segments:
        return []

    # Calculate spoken duration per speaker
    from collections import defaultdict

    speaker_time_ms = defaultdict(int)
    total_time_ms = 0
    for seg in segments:
        duration = seg.end_ms - seg.start_ms
        speaker_time_ms[seg.speaker_tag] += duration
        total_time_ms += duration

    # Get speaker display names
    speakers = db.query(Speaker).filter(Speaker.meeting_id.in_(meeting_ids)).all()
    speaker_names = {}
    for s in speakers:
        speaker_names[s.speaker_tag] = s.display_name

    results = []
    for tag, ms in speaker_time_ms.items():
        minutes = round(ms / 60000.0, 1)
        pct = round((ms / total_time_ms) * 100.0, 1) if total_time_ms > 0 else 0.0
        name = speaker_names.get(tag, tag)
        results.append(SpeakerMetric(name=name, minutes_spoken=minutes, percentage=pct))

    results.sort(key=lambda x: x.minutes_spoken, reverse=True)
    return results


@router.get("/topics", response_model=List[TopicMetric])
def get_topic_distribution(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Extract topics dynamically from meeting titles and transcripts
    meetings = (
        db.query(Meeting)
        .filter(Meeting.organization_id == current_user.organization_id)
        .all()
    )
    meeting_ids = [m.id for m in meetings]

    if not meeting_ids:
        return []

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id.in_(meeting_ids))
        .all()
    )

    import spacy
    from collections import Counter

    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = None

    candidates = []

    # Also extract from meeting titles (higher weight)
    for m in meetings:
        if m.title:
            candidates.extend([m.title.strip()] * 3)

    if nlp and segments:
        # Use first 150 segments to avoid slowing down API response
        full_text = " ".join(seg.text for seg in segments[:150])
        doc = nlp(full_text)
        for chunk in doc.noun_chunks:
            text = chunk.text.lower().strip()
            if (
                len(text) > 3
                and not chunk.root.is_stop
                and chunk.root.pos_ in ("NOUN", "PROPN")
            ):
                candidates.append(text.title())
    else:
        for seg in segments:
            for word in seg.text.split():
                clean_word = "".join(c for c in word if c.isalnum()).title()
                if len(clean_word) > 4 and clean_word not in (
                    "About",
                    "There",
                    "Their",
                    "Would",
                    "Could",
                    "Which",
                ):
                    candidates.append(clean_word)

    counts = Counter(candidates).most_common(5)
    results = [TopicMetric(topic=topic, count=count) for topic, count in counts]
    if not results:
        results = [TopicMetric(topic="No topics discussed yet", count=0)]
    return results
