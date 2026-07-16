from typing import Callable, Dict, List
from pydantic import BaseModel

class EventPayload(BaseModel):
    meeting_id: str
    event_type: str
    data: dict = {}

class EventRouter:
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, listener: Callable):
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(listener)

    def emit(self, event_type: str, payload: EventPayload):
        listeners = self._listeners.get(event_type, [])
        for listener in listeners:
            listener(payload)

event_router = EventRouter()
