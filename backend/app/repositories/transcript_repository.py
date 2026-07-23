import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Transcript, MeetingSpeaker, Meeting

logger = logging.getLogger(__name__)


from app.repositories.base import BaseRepository


class TranscriptRepository(BaseRepository[Transcript]):
    def __init__(self):
        super().__init__(Transcript)

    def get_transcript_segments(self, db: Session, meeting_id: str) -> List[Transcript]:
        """Retrieves transcript segments for a given meeting ordered by start time."""
        return (
            db.query(Transcript)
            .filter(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.start_time)
            .all()
        )

    def save_transcript(
        self,
        db: Session,
        meeting_id: str,
        segments: List[Dict[str, Any]],
        duration_seconds: int,
        speakers_map: Dict[str, str] = None,
        diarized_segments: Optional[List[Dict[str, Any]]] = None,
        speaker_mapping: Optional[Dict[int, Dict[str, Any]]] = None,
    ) -> int:
        """
        Saves speakers and segments in a transaction.
        Clears previous segments and speakers first for idempotency.
        Updates meeting duration.
        """
        try:
            # 1. Delete old transcript data
            deleted_segments = (
                db.query(Transcript)
                .filter(Transcript.meeting_id == meeting_id)
                .delete()
            )
            deleted_speakers = (
                db.query(MeetingSpeaker)
                .filter(MeetingSpeaker.meeting_id == meeting_id)
                .delete()
            )
            logger.info(
                f"TranscriptRepository | Meeting ID: {meeting_id} | Deleted {deleted_segments} transcripts and {deleted_speakers} meeting speakers for re-run."
            )

            # 2. Use the new diarized inputs if provided, otherwise convert legacy format
            if diarized_segments is not None and speaker_mapping is not None:
                # Save meeting speakers
                db_speakers = {}
                for spk_num, info in speaker_mapping.items():
                    speaker = MeetingSpeaker(
                        meeting_id=meeting_id,
                        speaker_number=spk_num,
                        display_name=info["display_name"],
                        voice_embedding=info["voice_embedding"],
                        confidence=info["confidence"],
                        is_confirmed=info["is_confirmed"],
                    )
                    db.add(speaker)
                    db.flush()  # Flush to generate speaker.id
                    db_speakers[spk_num] = speaker.id

                # Save transcripts
                for seg in diarized_segments:
                    spk_num = seg["speaker_number"]
                    speaker_id = db_speakers.get(spk_num)

                    transcript = Transcript(
                        meeting_id=meeting_id,
                        speaker_id=speaker_id,
                        start_time=seg["start_ms"] / 1000.0,
                        end_time=seg["end_ms"] / 1000.0,
                        text=seg["text"],
                        embedding=None,
                    )
                    db.add(transcript)

                num_saved = len(diarized_segments)
            else:
                # Legacy / fallback path
                logger.info("Using legacy path in save_transcript...")
                # Extract unique speaker tags
                unique_tags = set(seg["speaker_tag"] for seg in segments)

                # Assign a numeric index to each tag
                tag_to_num = {}
                for idx, tag in enumerate(sorted(unique_tags)):
                    tag_to_num[tag] = idx + 1

                # Save meeting speakers
                db_speakers = {}
                for tag, num in tag_to_num.items():
                    name = speakers_map.get(tag) if speakers_map else None
                    if not name:
                        name = f"Speaker {num}"

                    speaker = MeetingSpeaker(
                        meeting_id=meeting_id,
                        speaker_number=num,
                        display_name=name,
                        voice_embedding=None,
                        confidence=1.0,
                        is_confirmed=False,
                    )
                    db.add(speaker)
                    db.flush()
                    db_speakers[tag] = speaker.id

                # Save transcripts
                for seg in segments:
                    tag = seg["speaker_tag"]
                    speaker_id = db_speakers.get(tag)

                    # Convert start_ms/end_ms or start_time/end_time
                    start_time = seg.get("start_time", seg.get("start_ms", 0) / 1000.0)
                    end_time = seg.get("end_time", seg.get("end_ms", 0) / 1000.0)

                    transcript = Transcript(
                        meeting_id=meeting_id,
                        speaker_id=speaker_id,
                        start_time=start_time,
                        end_time=end_time,
                        text=seg["text"],
                        embedding=None,
                    )
                    db.add(transcript)

                num_saved = len(segments)

            # 4. Update meeting duration
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                meeting.duration_seconds = duration_seconds

            db.flush()
            logger.info(
                f"TranscriptRepository | Meeting ID: {meeting_id} | Wrote {num_saved} segments to database."
            )
            return num_saved
        except Exception as e:
            db.rollback()
            logger.error(
                f"TranscriptRepository | Meeting ID: {meeting_id} | Failed to save transcript: {e}"
            )
            raise e

    def save_segment_incremental(
        self, db: Session, meeting_id: str, segment: Dict[str, Any], speaker_tag: str
    ) -> Transcript:
        """
        Saves a single segment incrementally during transcription.
        Creates/gets a temporary MeetingSpeaker for the speaker_tag.
        """
        # Assign a speaker number based on the last number in speaker_tag (e.g. SPEAKER_00 -> 1)
        import re

        match = re.search(r"\d+", speaker_tag)
        spk_num = int(match.group(0)) + 1 if match else 1

        # Get or create speaker
        speaker = (
            db.query(MeetingSpeaker)
            .filter(
                MeetingSpeaker.meeting_id == meeting_id,
                MeetingSpeaker.speaker_number == spk_num,
            )
            .first()
        )
        if not speaker:
            speaker = MeetingSpeaker(
                meeting_id=meeting_id,
                speaker_number=spk_num,
                display_name=f"Speaker {spk_num}",
                confidence=0.5,
                is_confirmed=False,
            )
            db.add(speaker)
            db.flush()

        transcript = Transcript(
            meeting_id=meeting_id,
            speaker_id=speaker.id,
            start_time=segment["start_ms"] / 1000.0,
            end_time=segment["end_ms"] / 1000.0,
            text=segment["text"],
            embedding=None,
        )
        db.add(transcript)
        db.flush()
        return transcript

    def finalize_transcript(
        self,
        db: Session,
        meeting_id: str,
        diarized_segments: List[Dict[str, Any]],
        speaker_mapping: Dict[int, Dict[str, Any]],
        duration_seconds: int,
    ) -> int:
        """
        Updates the existing incremental transcripts and speakers with the final
        diarized results and historical speaker mapping.
        """
        try:
            # 1. Get or create final speakers in the database
            db_speakers = {}
            for spk_num, info in speaker_mapping.items():
                speaker = (
                    db.query(MeetingSpeaker)
                    .filter(
                        MeetingSpeaker.meeting_id == meeting_id,
                        MeetingSpeaker.speaker_number == spk_num,
                    )
                    .first()
                )
                if speaker:
                    # Update fields
                    speaker.display_name = info["display_name"]
                    speaker.voice_embedding = info["voice_embedding"]
                    speaker.confidence = info["confidence"]
                    speaker.is_confirmed = info["is_confirmed"]
                    speaker.contribution_percentage = info.get(
                        "contribution_percentage", 0.0
                    )
                    speaker.has_conflict = info.get("has_conflict", False)
                    speaker.conflict_details = info.get("conflict_details")
                else:
                    speaker = MeetingSpeaker(
                        meeting_id=meeting_id,
                        speaker_number=spk_num,
                        display_name=info["display_name"],
                        voice_embedding=info["voice_embedding"],
                        confidence=info["confidence"],
                        is_confirmed=info["is_confirmed"],
                        contribution_percentage=info.get(
                            "contribution_percentage", 0.0
                        ),
                        has_conflict=info.get("has_conflict", False),
                        conflict_details=info.get("conflict_details"),
                    )
                    db.add(speaker)
                db.flush()
                db_speakers[spk_num] = speaker.id

            # Delete any speakers that are not in the mapping anymore
            db.query(MeetingSpeaker).filter(
                MeetingSpeaker.meeting_id == meeting_id,
                ~MeetingSpeaker.speaker_number.in_(list(speaker_mapping.keys())),
            ).delete(synchronize_session=False)

            # 2. Update existing transcripts in order of start_time
            transcripts = (
                db.query(Transcript)
                .filter(Transcript.meeting_id == meeting_id)
                .order_by(Transcript.start_time)
                .all()
            )

            # Map transcripts to diarized segments. They should align exactly.
            for i, seg in enumerate(diarized_segments):
                spk_num = seg["speaker_number"]
                speaker_id = db_speakers.get(spk_num)

                if i < len(transcripts):
                    transcript = transcripts[i]
                    transcript.speaker_id = speaker_id
                    transcript.start_time = seg["start_ms"] / 1000.0
                    transcript.end_time = seg["end_ms"] / 1000.0
                    transcript.text = seg["text"]
                else:
                    # If somehow we have more segments now than saved, insert them
                    transcript = Transcript(
                        meeting_id=meeting_id,
                        speaker_id=speaker_id,
                        start_time=seg["start_ms"] / 1000.0,
                        end_time=seg["end_ms"] / 1000.0,
                        text=seg["text"],
                        embedding=None,
                    )
                    db.add(transcript)

            # If we had more transcripts in DB than in diarized_segments, delete the extra ones
            if len(transcripts) > len(diarized_segments):
                for extra in transcripts[len(diarized_segments) :]:
                    db.delete(extra)

            # 3. Update meeting duration
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                meeting.duration_seconds = duration_seconds

            db.commit()
            return len(diarized_segments)
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to finalize transcript: {e}")
            raise e
