from celery import Celery
from app.config.settings import get_env

REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("meetingmind_workers", broker=REDIS_URL, backend=REDIS_URL)

# Configure Celery tasks auto-discovery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
