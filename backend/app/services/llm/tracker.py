import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.models import AIModelUsage
from app.utils.llm_context import user_id_var, meeting_id_var, task_type_var

logger = logging.getLogger(__name__)


def log_llm_usage(
    provider: str,
    model_name: str,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    latency_seconds: Optional[float] = None,
    db: Optional[Session] = None,
) -> None:
    """
    Log LLM usage parameters into the database.
    Attempts to read user context from thread-safe ContextVars.
    """
    user_id = user_id_var.get()
    meeting_id = meeting_id_var.get()
    task_type = task_type_var.get()

    prompt_t = prompt_tokens or 0
    completion_t = completion_tokens or 0
    total_tokens = prompt_t + completion_t

    usage_record = AIModelUsage(
        user_id=user_id,
        meeting_id=meeting_id,
        provider=provider,
        model_name=model_name,
        task_type=task_type,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens if total_tokens > 0 else None,
        latency_seconds=latency_seconds,
    )

    # Use existing session or create a local transaction
    if db is not None:
        try:
            db.add(usage_record)
            db.commit()
            logger.info(
                f"Logged LLM Usage (via current session) | Provider: {provider} | Model: {model_name} | Tokens: {total_tokens} | Task: {task_type}"
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to log LLM usage inside db session transaction: {e}")
    else:
        try:
            with SessionLocal() as local_db:
                local_db.add(usage_record)
                local_db.commit()
                logger.info(
                    f"Logged LLM Usage (via new session) | Provider: {provider} | Model: {model_name} | Tokens: {total_tokens} | Task: {task_type}"
                )
        except Exception as e:
            logger.error(f"Failed to log LLM usage inside standalone db session: {e}")
