import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import TranscriptSegment, Speaker, Meeting

logger = logging.getLogger(__name__)


class TranscriptRepository:
    def get_transcript_segments(
        self, db: Session, meeting_id: str
    ) -> List[TranscriptSegment]:
        """Retrieves transcript segments for a given meeting ordered by start time."""
        return (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.start_ms)
            .all()
        )

    def save_transcript(
        self,
        db: Session,
        meeting_id: str,
        segments: List[Dict[str, Any]],
        duration_seconds: int,
    ) -> int:
        """
        Saves speakers and segments in a transaction.
        Clears previous segments and speakers first for idempotency.
        Updates meeting duration.
        """
        try:
            # 1. Delete old transcript data
            deleted_segments = (
                db.query(TranscriptSegment)
                .filter(TranscriptSegment.meeting_id == meeting_id)
                .delete()
            )
            deleted_speakers = (
                db.query(Speaker).filter(Speaker.meeting_id == meeting_id).delete()
            )
            logger.info(
                f"TranscriptRepository | Meeting ID: {meeting_id} | Deleted {deleted_segments} segments and {deleted_speakers} speakers for re-run."
            )

            # 2. Insert speakers
            speaker_tags = set(seg["speaker_tag"] for seg in segments)
            for tag in speaker_tags:
                display_name = f"Speaker {tag.split('_')[-1]}"
                speaker = Speaker(
                    meeting_id=meeting_id, speaker_tag=tag, display_name=display_name
                )
                db.add(speaker)

            # 3. Insert transcript segments
            for seg in segments:
                segment = TranscriptSegment(
                    meeting_id=meeting_id,
                    start_ms=seg["start_ms"],
                    end_ms=seg["end_ms"],
                    speaker_tag=seg["speaker_tag"],
                    text=seg["text"],
                    embedding=None,
                )
                db.add(segment)

            # 4. Update meeting duration
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                meeting.duration_seconds = duration_seconds

            db.flush()
            logger.info(
                f"TranscriptRepository | Meeting ID: {meeting_id} | Wrote {len(segments)} segments to database."
            )
            return len(segments)
        except Exception as e:
            db.rollback()
            logger.error(
                f"TranscriptRepository | Meeting ID: {meeting_id} | Failed to save transcript: {e}"
            )
            raise e
