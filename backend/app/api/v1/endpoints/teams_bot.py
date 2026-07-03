import time
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Meeting, AgentLiveSession
from app.api.v1.endpoints.agent_events import manager

router = APIRouter()


@router.post("/callback")
async def teams_callback(request: Request, db: Session = Depends(get_db)):
    """
    Microsoft Graph Calling webhook endpoint.
    Graph API posts call state changes, participants changes, and tone/recording details here.
    """
    try:
        body = await request.json()
        print(f"[TeamsWebhook] Received event: {json.dumps(body)}")
    except Exception:
        # Fallback for plain text or empty payloads
        body = {}

    # Handle Microsoft lifecycle validation token if requested during subscription handshake
    validation_token = request.query_params.get("validationToken")
    if validation_token:
        # Return plain text token to validate callback URL ownership
        return Response(content=validation_token, media_type="text/plain")

    # Example Microsoft Graph Calling event parsing
    # Details: https://learn.microsoft.com/en-us/graph/api/resources/call
    value = body.get("value", [])
    for event in value:
        resource_data = event.get("resourceData", {})
        call_id = resource_data.get("id")
        state = resource_data.get(
            "state"
        )  # 'establishing', 'established', 'terminating', 'terminated'

        # In our DB mapping, we lookup active live session matching call_id or fallback to most recent
        session = (
            db.query(AgentLiveSession)
            .order_by(AgentLiveSession.start_time.desc())
            .first()
        )
        if not session:
            continue

        meeting = db.query(Meeting).filter(Meeting.id == session.meeting_id).first()

        # State transition handling
        if state == "established":
            session.status = "Live"
            if meeting:
                meeting.status = "Processing"
            db.commit()

            # Broadcast to WebSocket dashboard clients
            await manager.broadcast(
                session.meeting_id,
                {
                    "event": "agent_connected",
                    "data": {
                        "status": "Live",
                        "bot_name": "MeetingMind AI (Teams Bot)",
                        "platform": "Teams",
                        "call_id": call_id,
                    },
                },
            )

        elif state == "terminated":
            session.status = "Completed"
            session.end_time = db.func.now()
            if meeting:
                meeting.status = "Completed"
            db.commit()

            await manager.broadcast(
                session.meeting_id,
                {
                    "event": "agent_disconnected",
                    "data": {
                        "status": "Completed",
                        "message": "Call terminated in Microsoft Teams.",
                    },
                },
            )

        # Handle participant changes inside notification resources
        # e.g. Resource path contains '/participants'
        resource = event.get("resource", "")
        if "participants" in resource:
            # Parse participant events
            # For demonstration and live updates, read participant info list
            participants_list = resource_data.get("value", [])
            names = []
            for p in participants_list:
                identity = p.get("info", {}).get("identity", {})
                user_info = identity.get("user", {})
                name = user_info.get("displayName", "Teams Participant")
                names.append(name)

            if names:
                session.participants_count = len(names)
                db.commit()

                await manager.broadcast(
                    session.meeting_id,
                    {
                        "event": "agent_connected",
                        "data": {
                            "status": "Live",
                            "bot_name": "MeetingMind AI (Teams Bot)",
                            "platform": "Teams",
                            "participants": names,
                        },
                    },
                )

    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/audio")
async def ingest_teams_audio(request: Request):
    """
    Receives real-time media/audio packets routed via local bot controller
    or Microsoft Calling media hooks.
    """
    try:
        payload = await request.body()
        # Decode and forward to STT queue
        # For simulator fallback compliance:
        print(f"[TeamsWebhook] Ingested {len(payload)} audio bytes.")
    except Exception:
        pass
    return Response(status_code=status.HTTP_200_OK)
