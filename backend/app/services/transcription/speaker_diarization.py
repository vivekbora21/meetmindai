import logging
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from app.services.transcription.voice_embedding import VoiceEmbeddingService

logger = logging.getLogger(__name__)


class SpeakerDiarizationService:
    def __init__(self):
        self.embedding_service = VoiceEmbeddingService()

    def diarize(
        self, audio_path: str, segments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Optimized speaker diarization analyzing full audio timeline.
        Instead of extracting embeddings for all Whisper segments individually,
        we group adjacent segments into contiguous 'turns' (timeline chunks),
        extract a single voice embedding per turn, cluster these turn embeddings,
        and assign speaker numbers back to all original segments based on their turn assignment.
        """
        if not segments:
            return []

        logger.info(
            f"Starting optimized speaker diarization for {len(segments)} segments..."
        )

        # 1. Group segments into turns to form the speaker timeline
        # Target duration of 15 seconds per turn, maximum gap of 2.5 seconds
        target_turn_duration_sec = 15.0
        max_gap_sec = 2.5

        turns = []
        current_turn = {
            "start_ms": segments[0]["start_ms"],
            "end_ms": segments[0]["end_ms"],
            "segment_indices": [0],
        }

        for idx in range(1, len(segments)):
            seg = segments[idx]
            gap = (seg["start_ms"] - current_turn["end_ms"]) / 1000.0
            current_duration = (
                current_turn["end_ms"] - current_turn["start_ms"]
            ) / 1000.0

            if gap < max_gap_sec and current_duration < target_turn_duration_sec:
                current_turn["end_ms"] = seg["end_ms"]
                current_turn["segment_indices"].append(idx)
            else:
                turns.append(current_turn)
                current_turn = {
                    "start_ms": seg["start_ms"],
                    "end_ms": seg["end_ms"],
                    "segment_indices": [idx],
                }
        turns.append(current_turn)

        logger.info(
            f"Grouped {len(segments)} segments into {len(turns)} turns/timeline chunks."
        )

        # 2. Extract embeddings for all turns
        valid_turns = []
        embeddings = []
        for idx, turn in enumerate(turns):
            start_ms = turn["start_ms"]
            end_ms = turn["end_ms"]
            duration = (end_ms - start_ms) / 1000.0

            embedding = None
            if duration >= 0.5:
                try:
                    embedding = self.embedding_service.get_embedding(
                        audio_path, start_ms, end_ms
                    )
                except Exception as e:
                    logger.warning(f"Failed to get voice embedding for turn {idx}: {e}")

            if embedding is not None:
                embeddings.append(embedding)
                valid_turns.append((idx, turn, embedding))
            else:
                valid_turns.append((idx, turn, None))

        # Filter out turns that have valid embeddings for clustering
        clustered_indices = [
            i for i, (idx, turn, emb) in enumerate(valid_turns) if emb is not None
        ]
        clustered_embs = [valid_turns[i][2] for i in clustered_indices]

        # 3. Perform clustering on turn embeddings
        labels = []
        if len(clustered_embs) == 0:
            labels = [0] * len(turns)
            clustered_indices = list(range(len(turns)))
        elif len(clustered_embs) == 1:
            labels = [0]
        else:
            X = np.array(clustered_embs)
            try:
                clustering = AgglomerativeClustering(
                    n_clusters=None,
                    distance_threshold=0.55,
                    metric="cosine",
                    linkage="average",
                )
                clustering.fit(X)
                labels = clustering.labels_.tolist()
            except Exception as e:
                logger.warning(
                    f"AgglomerativeClustering failed: {e}. Falling back to default cluster count."
                )
                try:
                    clustering = AgglomerativeClustering(n_clusters=min(len(X), 3))
                    clustering.fit(X)
                    labels = clustering.labels_.tolist()
                except Exception as ex:
                    logger.error(
                        f"Fallback clustering failed: {ex}. Assigning to a single speaker."
                    )
                    labels = [0] * len(X)

        # 4. Map clustered labels back to turns
        turn_speaker_numbers = [1] * len(turns)
        turn_embeddings = [None] * len(turns)

        for i, label in zip(clustered_indices, labels):
            orig_idx = valid_turns[i][0]
            turn_speaker_numbers[orig_idx] = label + 1
            turn_embeddings[orig_idx] = valid_turns[i][2]

        # Propagate speaker numbers for turns without embeddings
        for idx in range(len(turns)):
            if valid_turns[idx][2] is None:
                # Find nearest turn with valid embedding
                nearest_label = 1
                min_dist = float("inf")
                for c_idx in clustered_indices:
                    orig_c_idx = valid_turns[c_idx][0]
                    dist = abs(orig_c_idx - idx)
                    if dist < min_dist:
                        min_dist = dist
                        nearest_label = turn_speaker_numbers[orig_c_idx]
                turn_speaker_numbers[idx] = nearest_label

        # Calculate centroids for speakers based on turn embeddings
        unique_speakers = set(turn_speaker_numbers)
        centroids = {}
        for spk in unique_speakers:
            spk_embs = [
                np.array(valid_turns[i][2])
                for i in clustered_indices
                if turn_speaker_numbers[valid_turns[i][0]] == spk
            ]
            if spk_embs:
                centroids[spk] = np.mean(spk_embs, axis=0)
                norm = np.linalg.norm(centroids[spk])
                if norm > 0:
                    centroids[spk] = centroids[spk] / norm

        # 5. Build final result segments list by mapping original segments to their turn speaker and computing confidence
        diarized_segments = []
        for turn_idx, turn in enumerate(turns):
            spk = turn_speaker_numbers[turn_idx]
            turn_emb = turn_embeddings[turn_idx]

            # Compute confidence for this turn
            confidence = 0.5
            if turn_emb is not None and spk in centroids:
                centroid = centroids[spk]
                sim = np.dot(turn_emb, centroid)
                confidence = float(max(0.0, min(1.0, (sim + 1.0) / 2.0)))
                confidence = round(confidence, 3)

            for seg_idx in turn["segment_indices"]:
                seg = segments[seg_idx]
                diarized_seg = seg.copy()
                diarized_seg["speaker_number"] = spk
                diarized_seg["confidence"] = confidence
                diarized_seg["voice_embedding"] = turn_emb
                diarized_segments.append(diarized_seg)

        # Sort diarized_segments to keep original order intact
        diarized_segments.sort(key=lambda s: s["start_ms"])

        logger.info(
            f"Diarization completed. Identified {len(unique_speakers)} speakers."
        )
        return diarized_segments
