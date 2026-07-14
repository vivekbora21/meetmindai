from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.models import (
    Meeting,
    ActionItem,
    Decision,
    Risk,
    User,
    MeetingSpeaker,
    Transcript,
)
from app.helpers.auth import get_current_user
from app.schemas.analytics import AnalyticsOverview, SpeakerMetric, TopicMetric

router = APIRouter()


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

    segments = db.query(Transcript).filter(Transcript.meeting_id.in_(meeting_ids)).all()
    if not segments:
        return []

    # Get speaker display names first
    speakers = (
        db.query(MeetingSpeaker)
        .filter(MeetingSpeaker.meeting_id.in_(meeting_ids))
        .all()
    )
    speaker_names = {}
    for s in speakers:
        speaker_names[s.id] = s.display_name

    # Calculate spoken duration per speaker display name
    from collections import defaultdict

    speaker_time_sec = defaultdict(float)
    total_time_sec = 0.0
    for seg in segments:
        duration = max(0.0, seg.end_time - seg.start_time)
        name = speaker_names.get(seg.speaker_id, "Unknown Speaker")
        speaker_time_sec[name] += duration
        total_time_sec += duration

    results = []
    for name, secs in speaker_time_sec.items():
        minutes = round(secs / 60.0, 1)
        pct = round((secs / total_time_sec) * 100.0, 1) if total_time_sec > 0 else 0.0
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

    segments = db.query(Transcript).filter(Transcript.meeting_id.in_(meeting_ids)).all()

    from collections import Counter

    try:
        import spacy

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
                    "Thats",
                    "Think",
                    "Ensure",
                    "Going",
                    "Maybe",
                    "Should",
                    "Really",
                    "Using",
                    "Where",
                    "These",
                    "Those",
                    "Every",
                    "Other",
                    "Because",
                    "Through",
                    "Under",
                    "Before",
                    "After",
                    "Still",
                    "Always",
                    "Never",
                    "Something",
                    "Anything",
                    "Someone",
                    "Anyone",
                    "First",
                    "Second",
                    "Third",
                    "Right",
                    "People",
                    "Things",
                    "Doing",
                    "Table",
                    "Query",
                    "Field",
                ):
                    candidates.append(clean_word)

    counts = Counter(candidates).most_common(5)
    results = [TopicMetric(topic=topic, count=count) for topic, count in counts]
    if not results:
        results = [TopicMetric(topic="No topics discussed yet", count=0)]
    return results
