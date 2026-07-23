import logging
import os
import sys
import time

logger = logging.getLogger("meeting.worker")


class ModelRegistry:
    _whisper = None
    _embedder = None
    _diarizer_model = None

    @classmethod
    def load_models(cls):
        pid = os.getpid()
        start_time = time.time()

        # Parse queues from command line args or environment variables
        queues = set()
        try:
            args = sys.argv
            for i, arg in enumerate(args):
                if arg == "-Q" and i + 1 < len(args):
                    for q in args[i + 1].split(","):
                        queues.add(q.strip())
                elif arg.startswith("--queues="):
                    for q in arg.split("=")[1].split(","):
                        queues.add(q.strip())
        except Exception:
            pass

        env_queues = os.getenv("CELERY_QUEUES")
        if env_queues:
            for q in env_queues.split(","):
                queues.add(q.strip())

        # If no queue is specified, assume default behavior (all queues)
        has_critical = "critical" in queues or not queues
        has_background = "background" in queues or not queues
        has_speaker = "speaker" in queues or not queues

        queue_str = (
            ", ".join(sorted(queues))
            if queues
            else "critical, background, speaker, maintenance, celery"
        )

        # 1. Load Whisper for critical queue
        if has_critical:
            start_whisper = time.time()
            logger.debug(
                "[ModelRegistry] Pre-loading Whisper model for critical tasks..."
            )
            try:
                from app.services.whisper_service import WhisperService
                from faster_whisper import WhisperModel

                whisper_svc = WhisperService()
                cls._whisper = WhisperModel(
                    whisper_svc.model_size,
                    device=whisper_svc.device,
                    compute_type=whisper_svc.compute_type,
                )
                elapsed = time.time() - start_whisper
                logger.info(f"[critical] Whisper model loaded ({elapsed:.1f}s)")
            except Exception as e:
                logger.error(f"[critical] Whisper model loading failed: {e}")

        # 2. Load Embedding for background queue
        if has_background:
            start_embed = time.time()
            logger.debug(
                "[ModelRegistry] Pre-loading local SentenceTransformer model for embedding tasks..."
            )
            try:
                from sentence_transformers import SentenceTransformer

                cls._embedder = SentenceTransformer(
                    "nomic-ai/nomic-embed-text-v1", trust_remote_code=True
                )
                elapsed = time.time() - start_embed
                logger.info(f"[embedding] SentenceTransformer loaded ({elapsed:.1f}s)")
            except Exception as e:
                logger.error(f"[embedding] SentenceTransformer loading failed: {e}")

        # 3. Load Speaker Diarization (SpeechBrain) for speaker queue
        if has_speaker:
            start_diarizer = time.time()
            logger.debug(
                "[ModelRegistry] Pre-loading SpeechBrain model for diarization tasks..."
            )
            try:
                from speechbrain.inference.speaker import EncoderClassifier
                from app.services.transcription.voice_embedding import (
                    VoiceEmbeddingService,
                )

                voice_svc = VoiceEmbeddingService()
                cls._diarizer_model = EncoderClassifier.from_hparams(
                    source=voice_svc.model_source, run_opts={"device": voice_svc.device}
                )
                elapsed = time.time() - start_diarizer
                logger.info(f"[speaker] SpeechBrain model loaded ({elapsed:.1f}s)")
            except Exception as e:
                logger.error(f"[speaker] SpeechBrain model loading failed: {e}")

        # Register readiness in Redis
        try:
            import redis
            from app.config.settings import get_env

            redis_url = get_env("REDIS_URL", "redis://localhost:6379/0")
            r = redis.Redis.from_url(redis_url)

            # Determine current worker type from queues
            if "critical" in queues:
                w_type = "critical"
            elif "speaker" in queues:
                w_type = "speaker"
            elif "background" in queues:
                w_type = "embedding"
            elif "maintenance" in queues:
                w_type = "maintenance"
            else:
                w_type = "maintenance"

            r.sadd("meetingmind:ready_workers", w_type)
        except Exception as re:
            logger.debug(f"Failed to record worker readiness in Redis: {re}")

        total_elapsed = time.time() - start_time
        logger.debug(
            f"Worker PID {pid} started in {total_elapsed:.1f}s (Queues: {queue_str})"
        )
