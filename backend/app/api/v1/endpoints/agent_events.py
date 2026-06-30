import asyncio
import json
import time
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter()

# Active WebSocket connections grouped by meeting/session ID
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"[WebSocket] Connected client to session: {session_id}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        print(f"[WebSocket] Disconnected client from session: {session_id}")

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            data = json.dumps(message)
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    pass

manager = ConnectionManager()

class SimulationRequest(BaseModel):
    meeting_id: str
    platform: str # 'Teams', 'Google Meet', 'Zoom'

@router.websocket("/live/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        # Keep connection open and listen for client heartbeats/messages
        while True:
            data = await websocket.receive_text()
            # Respond to ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)

@router.post("/simulate")
async def start_meeting_simulation(request: SimulationRequest):
    """
    Spawns a background task that simulates an autonomous meeting agent
    joining a live call, emitting WebRTC audio, running real-time speech pipelines,
    and pushing updates to WebSocket clients.
    """
    asyncio.create_task(run_agent_simulation(request.meeting_id, request.platform))
    return {"status": "Simulation started", "meeting_id": request.meeting_id}

async def run_agent_simulation(meeting_id: str, platform: str):
    print(f"[AgentSimulation] Starting agent simulation for meeting {meeting_id} on {platform}...")
    
    # 1. Emit connecting status
    await manager.broadcast(meeting_id, {
        "event": "agent_connected",
        "data": {
            "status": "Connecting",
            "bot_name": "MeetingMind AI",
            "platform": platform
        }
    })
    await asyncio.sleep(2.0)

    # 2. Emit joined status with participants
    participants = ["Vivek Sharma", "Alex Rivera"]
    await manager.broadcast(meeting_id, {
        "event": "agent_connected",
        "data": {
            "status": "Live",
            "bot_name": "MeetingMind AI",
            "platform": platform,
            "participants": participants
        }
    })
    await asyncio.sleep(1.5)

    # 3. Simulate conversations chunks
    conversation_steps = [
        {
            "speaker": "Vivek Sharma",
            "text": "Hello team, let's establish the multi-platform meeting agent design.",
            "duration": 3.0
        },
        {
            "speaker": "Alex Rivera",
            "text": "Hi Vivek. We should build an abstract class that handles Teams, Meet, and Zoom connectors.",
            "duration": 4.5
        },
        {
            "speaker": "Vivek Sharma",
            "text": "Correct. Let's make sure the audio streams are processed in real-time.",
            "duration": 3.0
        },
        {
            "speaker": "Alex Rivera",
            "text": "Perfect, we'll implement it. I'll open a ticket in Jira and sync it. Let's set a due date for Friday.",
            "duration": 5.0,
            "insight": {
                "type": "Action Item",
                "description": "Implement Abstract MeetingConnector class and verify WebRTC audio packet feeds",
                "assigned_to": "Alex Rivera",
                "due_date": "2026-07-03",
                "confidence_score": 0.98
            }
        },
        {
            "speaker": "Vivek Sharma",
            "text": "Excellent decision. Let's start building it today.",
            "duration": 2.5,
            "insight": {
                "type": "Decision",
                "decision_text": "Establish common MeetingConnector base schema for all ingestion services",
                "rationale": "Ensures clean expansion to future platforms like Webex and Slack Huddles",
                "confidence_score": 0.96
            }
        }
    ]

    for step in conversation_steps:
        # Start speaking event
        await manager.broadcast(meeting_id, {
            "event": "speaker_changed",
            "data": {
                "speaker": step["speaker"],
                "text": step["text"],
                "is_final": False
            }
        })
        # Simulate speech duration
        await asyncio.sleep(step["duration"])

        # Complete speech event
        await manager.broadcast(meeting_id, {
            "event": "speaker_changed",
            "data": {
                "speaker": step["speaker"],
                "text": step["text"],
                "is_final": True
            }
        })

        # Broadcast insight if detected
        if "insight" in step:
            await manager.broadcast(meeting_id, {
                "event": "insight_detected",
                "data": step["insight"]
            })
        
        await asyncio.sleep(1.5)

    # 4. Agent leaves meeting
    await manager.broadcast(meeting_id, {
        "event": "agent_disconnected",
        "data": {
            "status": "Completed",
            "message": "Meeting ended. Agent exited successfully."
        }
    })
    print(f"[AgentSimulation] Simulation finished for meeting {meeting_id}.")
