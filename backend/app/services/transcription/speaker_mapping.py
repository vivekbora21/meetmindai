import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from app.models.models import MeetingSpeaker, Meeting
from app.services.transcription.voice_embedding import VoiceEmbeddingService

logger = logging.getLogger(__name__)


class SpeakerMappingService:
    def __init__(self):
        self.embedding_service = VoiceEmbeddingService()

    def map_speakers_to_historical(
        self,
        db: Session,
        organization_id: str,
        meeting_id: str,
        diarized_segments: List[Dict[str, Any]],
        similarity_threshold: float = 0.78,
    ) -> Dict[int, Dict[str, Any]]:
        """
        Compares speaker centroids in the current meeting with historically confirmed speakers
        in the same organization.

        Returns a mapping from speaker_number to dict:
            {
                speaker_number: {
                    "display_name": str,
                    "is_confirmed": bool,
                    "confidence": float,
                    "voice_embedding": List[float] (centroid)
                }
            }
        """
        # 1. Compute centroid embeddings for each speaker_number in the new meeting
        speaker_segments = {}
        for seg in diarized_segments:
            spk_num = seg["speaker_number"]
            emb = seg.get("voice_embedding")
            if emb is not None:
                if spk_num not in speaker_segments:
                    speaker_segments[spk_num] = []
                speaker_segments[spk_num].append(emb)

        speaker_centroids = {}
        for spk_num, embs in speaker_segments.items():
            centroid = np.mean(embs, axis=0)
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm
            speaker_centroids[spk_num] = centroid.tolist()

        # 2. Retrieve all confirmed speaker embeddings for this organization
        historical_speakers = (
            db.query(MeetingSpeaker)
            .join(Meeting, MeetingSpeaker.meeting_id == Meeting.id)
            .filter(
                Meeting.organization_id == organization_id,
                MeetingSpeaker.is_confirmed == True,
                MeetingSpeaker.voice_embedding != None,
            )
            .all()
        )

        # Build a dictionary of historical speakers, keeping the most recent embedding for each unique display_name
        historical_profiles = {}
        for hs in historical_speakers:
            name = hs.display_name
            emb = hs.voice_embedding
            if not emb:
                continue
            # If we already have this name, keep the newer one or let's aggregate them
            historical_profiles[name] = emb

        logger.info(
            f"Loaded {len(historical_profiles)} unique confirmed speaker profiles for organization."
        )

        # 3. Compare centroids to historical profiles
        speaker_mapping = {}
        for spk_num, centroid in speaker_centroids.items():
            best_name = None
            best_sim = -1.0

            for name, hist_emb in historical_profiles.items():
                sim = self.embedding_service.compute_similarity(centroid, hist_emb)
                if sim > best_sim:
                    best_sim = sim
                    best_name = name

            logger.info(
                f"Speaker {spk_num} best match: {best_name} with similarity {best_sim:.3f}"
            )

            if best_name and best_sim >= similarity_threshold:
                # Automatically assign
                speaker_mapping[spk_num] = {
                    "display_name": best_name,
                    "is_confirmed": True,
                    "confidence": round(best_sim, 3),
                    "voice_embedding": centroid,
                }
                logger.info(
                    f"Auto-assigned Speaker {spk_num} to '{best_name}' (similarity: {best_sim:.3f})"
                )
            else:
                # Generic label, unconfirmed
                speaker_mapping[spk_num] = {
                    "display_name": f"Speaker {spk_num}",
                    "is_confirmed": False,
                    "confidence": 0.0 if best_sim == -1.0 else round(best_sim, 3),
                    "voice_embedding": centroid,
                }

        # Handle any speakers that didn't have any segments with embeddings
        all_speaker_numbers = set(seg["speaker_number"] for seg in diarized_segments)
        for spk_num in all_speaker_numbers:
            if spk_num not in speaker_mapping:
                speaker_mapping[spk_num] = {
                    "display_name": f"Speaker {spk_num}",
                    "is_confirmed": False,
                    "confidence": 0.0,
                    "voice_embedding": None,
                }

        return speaker_mapping

    def confirm_and_rename_speaker(
        self, db: Session, meeting_id: str, speaker_number: int, new_display_name: str
    ) -> bool:
        """
        Manually confirms and renames a speaker.
        Updates the voice embedding for future returning-speaker recognition.
        """
        speaker = (
            db.query(MeetingSpeaker)
            .filter(
                MeetingSpeaker.meeting_id == meeting_id,
                MeetingSpeaker.speaker_number == speaker_number,
            )
            .first()
        )
        if not speaker:
            logger.error(f"Speaker {speaker_number} not found for meeting {meeting_id}")
            return False

        speaker.display_name = new_display_name
        speaker.is_confirmed = True
        speaker.updated_at = (
            db.utcnow() if hasattr(db, "utcnow") else np.datetime64("now")
        )

        db.commit()
        logger.info(
            f"Confirmed speaker {speaker_number} as '{new_display_name}' in meeting {meeting_id}"
        )
        return True
