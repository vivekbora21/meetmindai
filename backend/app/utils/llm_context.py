from contextvars import ContextVar
from contextlib import contextmanager
from typing import Optional

user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
meeting_id_var: ContextVar[Optional[str]] = ContextVar("meeting_id", default=None)
task_type_var: ContextVar[Optional[str]] = ContextVar("task_type", default=None)


@contextmanager
def set_llm_context(
    user_id: Optional[str] = None,
    meeting_id: Optional[str] = None,
    task_type: Optional[str] = None,
):
    """
    Context manager to safely bind user, meeting, and task context
    for downstream LLM usage tracking.
    """
    tokens = []

    if user_id is not None:
        tokens.append((user_id_var, user_id_var.set(user_id)))
    if meeting_id is not None:
        tokens.append((meeting_id_var, meeting_id_var.set(meeting_id)))
    if task_type is not None:
        tokens.append((task_type_var, task_type_var.set(task_type)))

    try:
        yield
    finally:
        for var, token in reversed(tokens):
            var.reset(token)
