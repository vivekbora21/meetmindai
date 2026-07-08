import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Transcript,
    MeetingSpeaker,
    ActionItem,
    Decision,
    Risk,
    Question,
    Meeting,
)

logger = logging.getLogger(__name__)


class SpeakerStatisticsService:
    def get_meeting_analytics(self, db: Session, meeting_id: str) -> Dict[str, Any]:
        """
        Computes detailed analytics for a meeting:
        - Participants breakdown (name, contributions, speaking time, percentage)
        - Speaking time distribution
        - Conversation distribution
        - Most active speaker
        - Least active speaker
        - Total metrics: Questions Asked, Decisions Made, Action Items Assigned
        """
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return {}

        speakers = (
            db.query(MeetingSpeaker)
            .filter(MeetingSpeaker.meeting_id == meeting_id)
            .all()
        )
        transcripts = (
            db.query(Transcript)
            .filter(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.start_time)
            .all()
        )

        total_speaking_time = 0.0
        speaker_stats = {}

        # Initialize speaker stats
        for s in speakers:
            speaker_stats[s.id] = {
                "id": s.id,
                "speaker_number": s.speaker_number,
                "display_name": s.display_name,
                "contributions": 0,
                "speaking_seconds": 0.0,
                "percentage": 0.0,
                "is_confirmed": s.is_confirmed,
                "confidence": s.confidence or 0.0,
            }

        # Calculate contributions and durations
        for t in transcripts:
            if not t.speaker_id or t.speaker_id not in speaker_stats:
                continue
            duration = max(0.0, t.end_time - t.start_time)
            speaker_stats[t.speaker_id]["contributions"] += 1
            speaker_stats[t.speaker_id]["speaking_seconds"] += duration
            total_speaking_time += duration

        # Compute percentages
        participants = []
        for s_id, stats in speaker_stats.items():
            if total_speaking_time > 0:
                stats["percentage"] = round(
                    (stats["speaking_seconds"] / total_speaking_time) * 100, 1
                )
            else:
                stats["percentage"] = 0.0

            # Format speaking time as "Xm Ys" or "X.Y minutes"
            mins = int(stats["speaking_seconds"] // 60)
            secs = int(stats["speaking_seconds"] % 60)
            stats["speaking_time_str"] = (
                f"{mins}m {secs}s" if mins > 0 or secs > 0 else "0s"
            )
            stats["speaking_minutes"] = round(stats["speaking_seconds"] / 60.0, 2)
            participants.append(stats)

        # Sort participants by speaking time descending
        participants.sort(key=lambda x: x["speaking_seconds"], reverse=True)

        # Most and least active speakers
        most_active = None
        least_active = None
        if participants:
            most_active = {
                "name": participants[0]["display_name"],
                "speaking_minutes": participants[0]["speaking_minutes"],
                "contributions": participants[0]["contributions"],
            }
            # Least active is the last one with > 0 seconds spoken
            active_participants = [p for p in participants if p["speaking_seconds"] > 0]
            if active_participants:
                least_active = {
                    "name": active_participants[-1]["display_name"],
                    "speaking_minutes": active_participants[-1]["speaking_minutes"],
                    "contributions": active_participants[-1]["contributions"],
                }
            else:
                least_active = {
                    "name": participants[-1]["display_name"],
                    "speaking_minutes": participants[-1]["speaking_minutes"],
                    "contributions": participants[-1]["contributions"],
                }

        # Conversation Distribution
        conv_distribution = {}
        for p in participants:
            conv_distribution[p["display_name"]] = p["percentage"]

        # Counts
        action_items_count = (
            db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).count()
        )
        decisions_count = (
            db.query(Decision).filter(Decision.meeting_id == meeting_id).count()
        )
        risks_count = db.query(Risk).filter(Risk.meeting_id == meeting_id).count()
        questions_count = (
            db.query(Question).filter(Question.meeting_id == meeting_id).count()
        )

        return {
            "participants": participants,
            "total_speaking_seconds": round(total_speaking_time, 2),
            "conversation_distribution": conv_distribution,
            "most_active_speaker": most_active,
            "least_active_speaker": least_active,
            "questions_asked": questions_count,
            "decisions_made": decisions_count,
            "action_items_assigned": action_items_count,
            "risks_detected": risks_count,
        }
