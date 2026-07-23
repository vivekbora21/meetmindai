from celery import Celery
from celery.signals import worker_process_init, setup_logging
from app.config.settings import get_env
from kombu import Queue

REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("meetingmind_workers", broker=REDIS_URL, backend=REDIS_URL)


@setup_logging.connect
def on_setup_logging(**kwargs):
    from app.utils.logging_pipeline import setup_logging as app_setup_logging
    from app.config.logging import logging_settings

    app_setup_logging(logging_settings.LOG_LEVEL)


# Configure Celery tasks auto-discovery and queues
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="celery",
    task_queues=[
        Queue("critical"),
        Queue("background"),
        Queue("speaker"),
        Queue("maintenance"),
        Queue("celery"),
    ],
    task_routes={
        "app.tasks.meeting_tasks.transcribe_audio": {"queue": "critical"},
        "app.tasks.meeting_tasks.generate_ai_analysis": {"queue": "critical"},
        "app.tasks.meeting_tasks.speaker_diarization": {"queue": "speaker"},
        "app.tasks.meeting_tasks.generate_embeddings": {"queue": "background"},
        "app.tasks.meeting_tasks.generate_knowledge_graph": {"queue": "background"},
        "app.tasks.meeting_tasks.generate_statistics": {"queue": "maintenance"},
        "app.tasks.meeting_tasks.generate_cache": {"queue": "maintenance"},
        "app.tasks.meeting_tasks.join_scheduled_meeting": {"queue": "critical"},
        "app.tasks.meeting_tasks.send_mom_email": {"queue": "maintenance"},
    },
)

# Explicitly import tasks so the worker registers them
celery_app.conf.imports = ("app.tasks.meeting_tasks",)


@worker_process_init.connect
def init_worker(**kwargs):
    from app.events.handlers import register_event_handlers
    from app.ml.model_loader import ModelRegistry

    register_event_handlers()
    ModelRegistry.load_models()
