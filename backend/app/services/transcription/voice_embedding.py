import os
import torch
import numpy as np
import logging
from typing import List, Optional
import soundfile as sf
import torchaudio

logger = logging.getLogger(__name__)


class VoiceEmbeddingService:
    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(VoiceEmbeddingService, cls).__new__(
                cls, *args, **kwargs
            )
        return cls._instance

    def __init__(self):
        # Prevent re-initialization if already initialized
        if hasattr(self, "initialized"):
            return

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # SpeechBrain model download and load
        self.model_source = "speechbrain/spkrec-ecapa-voxceleb"
        self.initialized = True

    @property
    def model(self):
        if self._model is None:
            from app.ml.model_loader import ModelRegistry
            if ModelRegistry._diarizer_model is not None:
                VoiceEmbeddingService._model = ModelRegistry._diarizer_model
            else:
                # Lazy load the encoder classifier to keep startup quick
                logger.info(
                    f"Loading SpeechBrain speaker embedding model on {self.device}..."
                )
                try:
                    from speechbrain.inference.speaker import EncoderClassifier

                    # Store the model inside a class variable
                    VoiceEmbeddingService._model = EncoderClassifier.from_hparams(
                        source=self.model_source, run_opts={"device": self.device}
                    )
                    logger.info("SpeechBrain speaker embedding model loaded successfully.")
                except Exception as e:
                    logger.error(f"Failed to load SpeechBrain model: {e}")
                    raise e
        return self._model

    def get_embedding(
        self,
        audio_path: str,
        start_ms: Optional[int] = None,
        end_ms: Optional[int] = None,
    ) -> Optional[List[float]]:
        """
        Extract speaker embedding (192-dim vector) for a specific segment of an audio file.
        Returns a list of 192 floats or None if extraction fails.
        """
        try:
            # Read segment if start_ms and end_ms are provided
            if start_ms is not None and end_ms is not None:
                # Load metadata to get sample rate
                info = sf.info(audio_path)
                sr = info.samplerate

                # Convert milliseconds to sample frames
                start_frame = int((start_ms / 1000.0) * sr)
                end_frame = int((end_ms / 1000.0) * sr)
                frames_to_read = end_frame - start_frame

                if frames_to_read <= 0:
                    return None

                # Read only the segment frames
                signal, fs = sf.read(
                    audio_path, start=start_frame, frames=frames_to_read
                )

                # Check if audio segment is empty or too short (needs at least some samples)
                if len(signal) < 160:  # 10ms at 16kHz
                    return None

                # Convert to PyTorch tensor
                signal_tensor = torch.tensor(signal, dtype=torch.float32)

                # Reshape if stereo to mono (SpeechBrain expects 1 channel)
                if len(signal_tensor.shape) > 1:
                    signal_tensor = torch.mean(signal_tensor, dim=1)

                # SpeechBrain model expects batch dimension: [batch, time]
                signal_tensor = signal_tensor.unsqueeze(0)
            else:
                # Load entire file
                signal, fs = torchaudio.load(audio_path)
                if signal.shape[0] > 1:
                    signal_tensor = torch.mean(signal, dim=0, keepdim=True)
                else:
                    signal_tensor = signal
                # Reshape to [batch, time]
                if signal_tensor.dim() == 3:
                    signal_tensor = signal_tensor.squeeze(0)
                elif signal_tensor.dim() == 1:
                    signal_tensor = signal_tensor.unsqueeze(0)

            # Resample to 16000Hz if necessary
            if fs != 16000:
                resampler = torchaudio.transforms.Resample(orig_freq=fs, new_freq=16000)
                signal_tensor = resampler(signal_tensor)

            # SpeechBrain requires float tensor on the correct device
            signal_tensor = signal_tensor.to(self.device)

            with torch.no_grad():
                # Compute embedding
                embeddings = self.model.encode_batch(signal_tensor)
                # Squeeze to shape [192]
                embedding_vector = embeddings.squeeze().cpu().numpy()

                # Normalize embedding
                norm = np.linalg.norm(embedding_vector)
                if norm > 0:
                    embedding_vector = embedding_vector / norm

                return embedding_vector.tolist()
        except Exception as e:
            logger.error(f"Error extracting voice embedding: {e}")
            return None

    def compute_similarity(self, emb1: List[float], emb2: List[float]) -> float:
        """
        Compute cosine similarity between two voice embeddings.
        Returns a float score in range [-1.0, 1.0].
        """
        if not emb1 or not emb2:
            return 0.0

        v1 = np.array(emb1)
        v2 = np.array(emb2)

        # Calculate cosine similarity: dot(v1, v2) / (norm(v1) * norm(v2))
        # Since they are normalized during extraction, this is just dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(np.dot(v1, v2) / (norm1 * norm2))
