import requests
import logging
from typing import List
from sqlalchemy.orm import Session
from app.models.models import Transcript, Meeting
from app.config.settings import get_env

logger = logging.getLogger(__name__)


class EmbeddingService:
    _query_cache = {}

    def __init__(self):
        self._embeddings_model = None
        self._embeddings_failed = False

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generates 1536-dimension embeddings using nomic-embed-text-v1.
        Supports Hugging Face serverless API, local sentence-transformers, or graceful fallback.
        """
        if text in self._query_cache:
            logger.info("EmbeddingService | Reusing cached embedding for query.")
            return self._query_cache[text]

        hf_token = get_env("HUGGINGFACE_API_KEY", "")

        # 1. Attempt Hugging Face Serverless Inference API
        if hf_token:
            try:
                headers = {"Authorization": f"Bearer {hf_token}"}
                api_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/nomic-ai/nomic-embed-text-v1"
                response = requests.post(
                    api_url,
                    headers=headers,
                    json={"inputs": text, "parameters": {"truncate": "END"}},
                    timeout=10,
                )
                if response.status_code == 200:
                    embedding = response.json()
                    if isinstance(embedding, list) and len(embedding) == 1536:
                        self._query_cache[text] = embedding
                        return embedding
                    elif isinstance(embedding, list) and len(embedding) > 0:
                        if len(embedding) < 1536:
                            res = embedding + [0.0] * (1536 - len(embedding))
                        else:
                            res = embedding[:1536]
                        self._query_cache[text] = res
                        return res
            except Exception as e:
                logger.warning(
                    f"EmbeddingService | HF serverless inference failed: {e}"
                )

        # 2. Attempt local sentence-transformers if package is loaded
        if self._embeddings_failed:
            return [0.0] * 1536

        try:
            if self._embeddings_model is None:
                from app.ml.model_loader import ModelRegistry
                if ModelRegistry._embedder is not None:
                    self._embeddings_model = ModelRegistry._embedder
                else:
                    from sentence_transformers import SentenceTransformer

                    logger.info(
                        "EmbeddingService | Loading local sentence-transformers model..."
                    )
                    self._embeddings_model = SentenceTransformer(
                        "nomic-ai/nomic-embed-text-v1", trust_remote_code=True
                    )

            embedding = self._embeddings_model.encode(text).tolist()
            if len(embedding) < 1536:
                embedding = embedding + [0.0] * (1536 - len(embedding))
            res = embedding[:1536]
            self._query_cache[text] = res
            return res
        except Exception as e:
            logger.error(f"EmbeddingService | Local sentence-transformers failed: {e}")
            self._embeddings_failed = True
            res = [0.0] * 1536
            self._query_cache[text] = res
            return res

    def update_segments_embeddings(self, db: Session, meeting_id: str) -> int:
        """
        Idempotent update of segment embeddings for a meeting.
        Retrieves all segments and updates the vector for each segment.
        """
        try:
            segments = (
                db.query(Transcript).filter(Transcript.meeting_id == meeting_id).all()
            )
            logger.info(
                f"EmbeddingService | Meeting ID: {meeting_id} | Seeding embeddings for {len(segments)} segments..."
            )

            for segment in segments:
                # Generate and save embedding (updates vector)
                segment.embedding = self.generate_embedding(segment.text)

            db.flush()
            logger.info(
                f"EmbeddingService | Meeting ID: {meeting_id} | Successfully saved embeddings for {len(segments)} segments."
            )
            return len(segments)
        except Exception as e:
            db.rollback()
            logger.error(
                f"EmbeddingService | Meeting ID: {meeting_id} | Failed to update segment embeddings: {e}"
            )
            raise e
