import time
import json
import logging
import logging.config
import functools
from contextlib import contextmanager
from typing import Dict, Any, Tuple, Optional
import redis
import os

# Dedicated loggers
pipeline_logger = logging.getLogger("meeting.pipeline")
performance_logger = logging.getLogger("meeting.performance")

class ColoredFormatter(logging.Formatter):
    """
    Console log formatter supporting customized color themes.
    Colors log lines depending on log level, logger name, and message content.
    """
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    def format(self, record: logging.LogRecord) -> str:
        # Check level and logger name to select color
        if record.levelno >= logging.ERROR:
            color = self.RED
        elif record.levelno >= logging.WARNING:
            color = self.YELLOW
        elif record.name.startswith("meeting.pipeline"):
            color = self.BLUE
        elif record.name.startswith("meeting.performance"):
            color = self.CYAN
        else:
            msg_str = str(record.msg)
            if "Completed" in msg_str or "SUCCESS" in msg_str or "Finished" in msg_str:
                color = self.GREEN
            else:
                color = ""

        # Format message
        log_msg = super().format(record)
        if color:
            return f"{color}{log_msg}{self.RESET}"
        return log_msg

class HTTPNoiseFilter(logging.Filter):
    """
    Custom logging filter to suppress HTTP request logs (HEAD, GET, redirects, 200 OK)
    and specific model key matching/downloading info lines.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        # If it's WARNING or higher, let it through
        if record.levelno >= logging.WARNING:
            return True

        msg = record.getMessage()
        noise_keywords = [
            "HEAD ",
            "GET ",
            "307 ",
            "200 OK",
            "README.md",
            "modules.json",
            "config.json",
            "tokenizer_config.json",
            "adapter_config.json",
            "All keys matched successfully",
            "HTTP Request:",
        ]
        if any(kw in msg for kw in noise_keywords):
            return False
        return True

def setup_logging(log_level: str = "INFO"):
    """
    Sets up the structured logging configuration, suppressing third-party loggers
    and configuring the custom colored formatter.
    """
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "noise_filter": {
                "()": "app.utils.logging_pipeline.HTTPNoiseFilter"
            }
        },
        "formatters": {
            "colored": {
                "()": "app.utils.logging_pipeline.ColoredFormatter",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
            "standard": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "colored",
                "stream": "ext://sys.stdout",
                "filters": ["noise_filter"],
            }
        },
        "root": {
            "handlers": ["console"],
            "level": log_level,
        },
        "loggers": {
            # Third-party loggers to suppress
            "httpx": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "requests": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "urllib3": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "transformers": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "sentence_transformers": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "huggingface_hub": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "torch": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "faster_whisper": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "speechbrain": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "pyannote": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "pyannote.audio": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "matplotlib": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "alembic": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            "uvicorn": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "uvicorn.access": {"level": "WARNING", "handlers": ["console"], "propagate": False},
            # Application loggers
            "meeting.pipeline": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.transcription": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.summary": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.embedding": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.graph": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.speaker": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.performance": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.api": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.database": {"level": "INFO", "handlers": ["console"], "propagate": False},
            "meeting.worker": {"level": "INFO", "handlers": ["console"], "propagate": False},
        }
    }
    logging.config.dictConfig(logging_config)

def format_duration(seconds: float) -> str:
    """Formats duration into 'Xm Ys' or 'X sec' format."""
    seconds = int(round(seconds))
    if seconds >= 60:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}m {secs:02d}s"
    else:
        return f"{seconds} sec"

class PipelineTracker:
    """
    Manages tracking pipeline stage execution, durations, and metadata in Redis.
    Compiles final performance reports when all stages complete.
    """
    STAGE_MAP = {
        1: ("upload", "Upload"),
        2: ("audio_extraction", "Audio Extraction"),
        3: ("transcription", "Transcription"),
        4: ("summary", "AI Summary"),
        5: ("diarization", "Speaker Diarization"),
        6: ("embeddings", "Embeddings"),
        7: ("knowledge_graph", "Knowledge Graph"),
        8: ("cache", "Cache"),
    }

    def __init__(self, meeting_id: str):
        self.meeting_id = meeting_id
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = redis.from_url(redis_url)
        self.redis_key = f"meeting_pipeline:{meeting_id}"

    def start_pipeline(self):
        """Initializes pipeline state in Redis."""
        pipe = self.redis_client.pipeline()
        pipe.hset(self.redis_key, "start_time", time.time())
        pipe.hset(self.redis_key, "total_stages", 8)
        pipe.hset(self.redis_key, "completed_stages_count", 0)
        pipe.hset(self.redis_key, "finalized", "false")
        for num, (key, _) in self.STAGE_MAP.items():
            pipe.hset(self.redis_key, f"{key}_status", "PENDING")
            pipe.hset(self.redis_key, f"{key}_duration", 0.0)
            pipe.hset(self.redis_key, f"{key}_metadata", "{}")
        pipe.execute()

        # Log start block
        pipeline_logger.info(
            f"==================================================\n"
            f"Meeting Processing Started\n"
            f"Meeting ID: {self.meeting_id}\n"
            f"=================================================="
        )

    def start_stage(self, stage_num: int):
        """Records start timestamp of a stage."""
        stage_key = self.STAGE_MAP[stage_num][0]
        self.redis_client.hset(self.redis_key, f"{stage_key}_start", time.time())
        self.redis_client.hset(self.redis_key, f"{stage_key}_status", "RUNNING")

    def end_stage(self, stage_num: int, status: str = "COMPLETED", metadata: Optional[dict] = None) -> float:
        """Records end timestamp, calculates duration, saves metadata, and checks completion."""
        stage_key, stage_name = self.STAGE_MAP[stage_num]
        end_time = time.time()
        start_time_str = self.redis_client.hget(self.redis_key, f"{stage_key}_start")
        duration = 0.0
        if start_time_str:
            duration = end_time - float(start_time_str)

        metadata_str = json.dumps(metadata or {})
        
        # Save results in Redis
        self.redis_client.hset(self.redis_key, f"{stage_key}_duration", duration)
        self.redis_client.hset(self.redis_key, f"{stage_key}_status", status)
        self.redis_client.hset(self.redis_key, f"{stage_key}_metadata", metadata_str)

        # Log completion immediately
        if status != "SKIPPED":
            log_msg = self._format_stage_log(stage_num, stage_name, duration, metadata or {})
            pipeline_logger.info(log_msg)

        # Atomically increment completed count
        completed_count = self.redis_client.hincrby(self.redis_key, "completed_stages_count", 1)

        # Check if all stages are done and print final report
        if completed_count >= 8:
            self._finalize_pipeline()

        return duration

    def _format_stage_log(self, stage_num: int, name: str, duration: float, metadata: dict) -> str:
        duration_str = format_duration(duration)
        separator = "\n----------------------------------\n" if stage_num > 1 else ""

        if stage_num == 3:  # Transcription
            model = metadata.get("model", "base")
            duration_sec = metadata.get("duration", 0)
            dur_min = int(round(duration_sec / 60))
            segments = metadata.get("segments", 0)
            return (
                f"{separator}[{stage_num}/8] {name}\n\n"
                f"Model:\n{model}\n\n"
                f"Duration:\n{dur_min} min\n\n"
                f"Segments:\n{segments}\n\n"
                f"Completed\n\n"
                f"Time:\n{duration_str}"
            )
        elif stage_num == 4:  # AI Summary
            provider = metadata.get("provider", "Gemini")
            model = metadata.get("model", "gemini-1.5-flash")
            prompt_tokens = metadata.get("prompt_tokens", 0)
            completion_tokens = metadata.get("completion_tokens", 0)
            return (
                f"{separator}[{stage_num}/8] {name}\n\n"
                f"Provider:\n{provider}\n\n"
                f"Model:\n{model}\n\n"
                f"Prompt Tokens:\n{prompt_tokens}\n\n"
                f"Completion Tokens:\n{completion_tokens}\n\n"
                f"Completed\n\n"
                f"Time:\n{duration_str}"
            )
        elif stage_num == 6:  # Embeddings
            chunks = metadata.get("chunks", 0)
            batch_size = metadata.get("batch_size", 32)
            return (
                f"{separator}[{stage_num}/8] {name}\n\n"
                f"Chunks:\n{chunks}\n\n"
                f"Batch Size:\n{batch_size}\n\n"
                f"Completed\n\n"
                f"Time:\n{duration_str}"
            )
        elif stage_num == 7:  # Knowledge Graph
            nodes = metadata.get("nodes", 0)
            edges = metadata.get("edges", 0)
            return (
                f"{separator}[{stage_num}/8] {name}\n\n"
                f"Nodes:\n{nodes}\n\n"
                f"Edges:\n{edges}\n\n"
                f"Completed\n\n"
                f"Time:\n{duration_str}"
            )
        else:
            return (
                f"{separator}[{stage_num}/8] {name}\n"
                f"Completed\n"
                f"Time: {duration_str}"
            )

    def _finalize_pipeline(self):
        """Compiles durations, prints final summary and performance report."""
        # Use Redis transaction/setnx to ensure only one worker prints the final report
        already_finalized = self.redis_client.hget(self.redis_key, "finalized")
        if already_finalized == b"true" or already_finalized == "true":
            return

        # Set finalized to true atomically
        self.redis_client.hset(self.redis_key, "finalized", "true")

        # Load all stage data
        pipe_data = self.redis_client.hgetall(self.redis_key)
        
        def get_float(field: str) -> float:
            val = pipe_data.get(field.encode("utf-8"))
            return float(val) if val else 0.0

        start_time = get_float("start_time")
        total_pipeline_time = time.time() - start_time if start_time > 0 else 0.0

        # Stages in performance report
        audio_extraction = get_float("audio_extraction_duration")
        transcription = get_float("transcription_duration")
        summary = get_float("summary_duration")
        embeddings = get_float("embeddings_duration")
        knowledge_graph = get_float("knowledge_graph_duration")

        total_stages_duration = audio_extraction + transcription + summary + embeddings + knowledge_graph

        stages_list = [
            ("Audio Extraction", audio_extraction),
            ("Transcription", transcription),
            ("Summary", summary),
            ("Embeddings", embeddings),
            ("Knowledge Graph", knowledge_graph)
        ]
        # Sort to find slowest & second slowest
        stages_list.sort(key=lambda x: x[1], reverse=True)
        slowest_stage = stages_list[0][0] if len(stages_list) > 0 else "N/A"
        second_slowest = stages_list[1][0] if len(stages_list) > 1 else "N/A"

        # Print final block
        pipeline_logger.info(
            f"\n==================================================\n"
            f"Meeting Processing Finished\n"
            f"Total Time:\n{format_duration(total_pipeline_time)}\n"
            f"=================================================="
        )

        # Print performance report
        report = (
            f"\n====================================================\n"
            f"Performance Report\n"
            f"====================================================\n"
            f"Audio Extraction\n{int(round(audio_extraction))} sec\n\n"
            f"Transcription\n{int(round(transcription))} sec\n\n"
            f"Summary\n{int(round(summary))} sec\n\n"
            f"Embeddings\n{int(round(embeddings))} sec\n\n"
            f"Knowledge Graph\n{int(round(knowledge_graph))} sec\n\n"
            f"Total\n{int(round(total_stages_duration))} sec\n\n"
            f"Slowest Stage\n{slowest_stage}\n\n"
            f"Second Slowest\n{second_slowest}\n"
            f"===================================================="
        )
        performance_logger.info(report)

        # Trigger MOM email task
        try:
            from app.tasks.meeting_tasks import send_mom_email
            send_mom_email.delay(self.meeting_id)
            pipeline_logger.info(f"Triggered send_mom_email task for meeting: {self.meeting_id}")
        except Exception as e:
            pipeline_logger.error(f"Failed to trigger send_mom_email task: {e}")

        # Invalidate pipeline metadata in Redis after finishing
        self.redis_client.delete(self.redis_key)


@contextmanager
def track_stage_ctx(meeting_id: str, stage_num: int):
    """Context manager to track start/end of a pipeline stage."""
    tracker = PipelineTracker(meeting_id)
    tracker.start_stage(stage_num)
    meta_container = {}
    status_container = {"status": "COMPLETED"}
    try:
        yield meta_container, status_container
    except Exception as e:
        status_container["status"] = "FAILED"
        tracker.end_stage(stage_num, status="FAILED", metadata=meta_container)
        raise e
    else:
        tracker.end_stage(stage_num, status=status_container["status"], metadata=meta_container)

def track_stage_dec(stage_num: int):
    """Decorator to track start/end of a pipeline stage in functions where meeting_id is the first or keyword arg."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Try to resolve meeting_id from arguments
            meeting_id = kwargs.get("meeting_id")
            if not meeting_id and len(args) > 0:
                # If bound method, args[0] is self, args[1] could be meeting_id
                if hasattr(args[0], "__class__") and len(args) > 1:
                    meeting_id = args[1]
                else:
                    meeting_id = args[0]

            if not meeting_id:
                # Fallback to standard execution if no meeting_id found
                return func(*args, **kwargs)

            with track_stage_ctx(meeting_id, stage_num) as (meta, status):
                result = func(*args, **kwargs)
                # If result is a dict with metadata, merge it
                if isinstance(result, dict):
                    meta.update(result)
                return result
        return wrapper
    return decorator
