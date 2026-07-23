from app.events.router import event_router, EventPayload
from app.tasks.meeting_tasks import (
    speaker_diarization,
    generate_embeddings,
    generate_statistics,
    generate_cache,
    generate_ai_analysis,
    generate_knowledge_graph,
)


def handle_meeting_transcribed(payload: EventPayload):
    meeting_id = payload.meeting_id
    # Launch all downstream work independently once transcript storage is complete.
    speaker_diarization.delay(meeting_id)
    generate_embeddings.delay(meeting_id)
    generate_statistics.delay(meeting_id)
    generate_cache.delay(meeting_id)
    generate_ai_analysis.delay(meeting_id)
    generate_knowledge_graph.delay(meeting_id)


def handle_diarization_completed(payload: EventPayload):
    meeting_id = payload.meeting_id
    # Tasks dependent on diarization could go here


def handle_ai_analysis_completed(payload: EventPayload):
    _ = payload.meeting_id
    # AI completion is now a terminal insight event; knowledge graph is already queued.
    return


def register_event_handlers():
    event_router.subscribe("meeting.transcribed", handle_meeting_transcribed)
    event_router.subscribe("meeting.diarized", handle_diarization_completed)
    event_router.subscribe("meeting.analyzed", handle_ai_analysis_completed)
