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
                    for q in args[i+1].split(","):
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

        queue_str = ", ".join(sorted(queues)) if queues else "critical, background, speaker, maintenance, celery"
        loaded_list = []

        # 1. Load Whisper for critical queue
        if has_critical:
            start_whisper = time.time()
            logger.info("[ModelRegistry] Pre-loading Whisper model for critical tasks...")
            try:
                from app.services.whisper_service import WhisperService
                from faster_whisper import WhisperModel
                whisper_svc = WhisperService()
                cls._whisper = WhisperModel(
                    whisper_svc.model_size,
                    device=whisper_svc.device,
                    compute_type=whisper_svc.compute_type
                )
                elapsed = time.time() - start_whisper
                loaded_list.append(f"Whisper ({elapsed:.1f} sec)")
            except Exception as e:
                logger.error(f"[ModelRegistry] Failed to pre-load Whisper: {e}")

        # 2. Load Embedding for background queue
        if has_background:
            start_embed = time.time()
            logger.info("[ModelRegistry] Pre-loading local SentenceTransformer model for embedding tasks...")
            try:
                from sentence_transformers import SentenceTransformer
                cls._embedder = SentenceTransformer("nomic-ai/nomic-embed-text-v1", trust_remote_code=True)
                elapsed = time.time() - start_embed
                loaded_list.append(f"Embedding ({elapsed:.1f} sec)")
            except Exception as e:
                logger.error(f"[ModelRegistry] Failed to pre-load Embedding model: {e}")

        # 3. Load Speaker Diarization (SpeechBrain) for speaker queue
        if has_speaker:
            start_diarizer = time.time()
            logger.info("[ModelRegistry] Pre-loading SpeechBrain model for diarization tasks...")
            try:
                from speechbrain.inference.speaker import EncoderClassifier
                from app.services.transcription.voice_embedding import VoiceEmbeddingService
                voice_svc = VoiceEmbeddingService()
                cls._diarizer_model = EncoderClassifier.from_hparams(
                    source=voice_svc.model_source,
                    run_opts={"device": voice_svc.device}
                )
                elapsed = time.time() - start_diarizer
                loaded_list.append(f"Speaker Diarization ({elapsed:.1f} sec)")
            except Exception as e:
                logger.error(f"[ModelRegistry] Failed to pre-load Speaker Diarization: {e}")

        total_elapsed = time.time() - start_time
        loaded_models_str = "\n".join(f"✓ {m}" for m in loaded_list) if loaded_list else "None"

        # Output exactly formatted startup message
        startup_msg = (
            f"\n==================================================\n\n"
            f"Worker PID {pid}\n\n"
            f"Queue\n"
            f"{queue_str}\n\n"
            f"Loaded Models\n"
            f"{loaded_models_str}\n\n"
            f"Startup Time\n"
            f"{total_elapsed:.1f} sec\n\n"
            f"=================================================="
        )
        logger.info(startup_msg)
