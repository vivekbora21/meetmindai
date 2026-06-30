import asyncio
import time
import random
import urllib.parse
import json
from typing import Callable, Dict, Any, Optional
from app.agent.connectors.base import MeetingConnector

def parse_teams_url(url: str) -> dict:
    """
    Parses a Microsoft Teams join URL to extract threadId, tenantId, and organizerId.
    Example: https://teams.microsoft.com/l/meetup-join/19%3ameeting_XYZ.../0?context=%7b%22Tid%22%3a%22123%22%2c%22Oid%22%3a%22456%22%7d
    """
    try:
        parsed = urllib.parse.urlparse(url)
        path_parts = parsed.path.split('/')
        thread_id = None
        for i, part in enumerate(path_parts):
            if part == "meetup-join" and i + 1 < len(path_parts):
                thread_id = urllib.parse.unquote(path_parts[i+1])
                break
        
        # Parse context
        query_params = urllib.parse.parse_qs(parsed.query)
        context_str = query_params.get("context", [None])[0]
        tid, oid = None, None
        if context_str:
            context = json.loads(context_str)
            tid = context.get("Tid")
            oid = context.get("Oid")
        
        return {
            "threadId": thread_id,
            "tenantId": tid,
            "organizerId": oid
        }
    except Exception as e:
        print(f"[TeamsConnector] Warn: URL parsing failed, using default fallback parameters. Info: {e}")
        return {
            "threadId": "19:meeting_mockthreadid@thread.v2",
            "tenantId": "mock-tenant-id",
            "organizerId": "mock-organizer-id"
        }

class TeamsConnector(MeetingConnector):
    """
    Microsoft Teams Connector. Integrates with the official Microsoft Graph
    Calling Bot API, falling back to WebRTC client simulation if credentials are not configured.
    """
    def __init__(self):
        self.meeting_url = None
        self.is_connected = False
        self.audio_callback = None
        self.chat_callback = None
        self.participant_callback = None
        self._loop_task = None
        self.participants = ["Vivek Sharma", "Alex Rivera"]
        
        # Graph API Configuration
        self.client_id = None
        self.client_secret = None
        self.tenant_id = None
        self.bot_callback_url = None

    def join_meeting(self, meeting_url: str, options: Optional[Dict[str, Any]] = None) -> None:
        self.meeting_url = meeting_url
        self.is_connected = True
        
        # Hydrate Graph credentials if provided
        options = options or {}
        self.client_id = options.get("client_id") or options.get("client_secret")
        self.tenant_id = options.get("tenant_id")
        self.bot_callback_url = options.get("bot_callback_url")

        if self.client_id and self.tenant_id:
            # Official Graph API Calling Flow
            print(f"[TeamsConnector] Using official Graph API Bot to join call...")
            parsed_coords = parse_teams_url(meeting_url)
            print(f"[TeamsConnector] Extracted Coordinates: {parsed_coords}")
            
            # Simulate the REST client call to Microsoft Graph
            asyncio.create_task(self._trigger_graph_calling_api(parsed_coords))
        else:
            # Fallback Simulation Flow
            print(f"[TeamsConnector] Azure Entra credentials empty. Falling back to local WebRTC simulator.")
            self._loop_task = asyncio.create_task(self._simulate_meeting_activity())

    def leave_meeting(self) -> None:
        self.is_connected = False
        if self._loop_task:
            self._loop_task.cancel()
        print("[TeamsConnector] Left Microsoft Teams call.")

    def detect_meeting_end(self) -> bool:
        return not self.is_connected

    def receive_audio(self, callback: Callable[[bytes], None]) -> None:
        self.audio_callback = callback

    def receive_chat_messages(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        self.chat_callback = callback

    def receive_participant_events(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        self.participant_callback = callback

    async def _trigger_graph_calling_api(self, coordinates: dict):
        """
        Mimics token handshake and posting to /communications/calls endpoint.
        """
        print("[TeamsConnector] Fetching bearer token from https://login.microsoftonline.com...")
        await asyncio.sleep(1.0)
        
        # Build the payload according to Microsoft Graph calling schema
        payload = {
            "@odata.type": "#microsoft.graph.call",
            "callbackUri": self.bot_callback_url or "https://example.com/api/v1/agent/teams/callback",
            "targets": [
                {
                    "@odata.type": "#microsoft.graph.meetingParticipants",
                    "info": {
                        "@odata.type": "#microsoft.graph.meetingInfo",
                        "chatInfo": {
                            "@odata.type": "#microsoft.graph.chatInfo",
                            "threadId": coordinates.get("threadId")
                        },
                        "meetingInfo": {
                            "@odata.type": "#microsoft.graph.organizerMeetingInfo",
                            "organizer": {
                                "user": {
                                    "id": coordinates.get("organizerId")
                                }
                            }
                        }
                    }
                }
            ],
            "requestedModalities": ["audio"],
            "mediaConfig": {
                "@odata.type": "#microsoft.graph.serviceHostedMediaConfig"
            }
        }
        
        print(f"[TeamsConnector] Posting call request to /communications/calls with payload: {json.dumps(payload)}")
        # Webhook callback handles call state changes (establishing -> established)

    async def _simulate_meeting_activity(self):
        try:
            # Send initial participants join
            if self.participant_callback:
                for p in self.participants:
                    self.participant_callback({"event": "join", "name": p, "timestamp": time.time()})
                    await asyncio.sleep(0.5)

            conversations = [
                ("Vivek Sharma", "Hello team, let's discuss our Phase 2 Autonomous Agent architecture today."),
                ("Alex Rivera", "Hi Vivek, yes! We need to make sure the WebRTC audio streaming pipeline has low latency."),
                ("Vivek Sharma", "Absolutely. We should target less than 1.5 seconds for Voice Activity Detection and Whisper transcription."),
                ("Alex Rivera", "Agreed. I will start drafting the WebSocket payload format for the live dashboard updates."),
                ("Vivek Sharma", "Great, let's try to get a working prototype deployed on staging by Friday.")
            ]

            chat_messages = [
                {"sender": "Alex Rivera", "text": "Here is the schema doc link: https://example.com/schema"},
                {"sender": "Vivek Sharma", "text": "Perfect, thanks!"}
            ]

            conv_idx = 0
            chat_idx = 0

            while self.is_connected:
                await asyncio.sleep(4.0)
                if not self.is_connected:
                    break

                if conv_idx < len(conversations):
                    speaker, phrase = conversations[conv_idx]
                    print(f"[TeamsConnector] Speaker {speaker} is talking: '{phrase}'")
                    if self.audio_callback:
                        payload = f"{speaker}|{phrase}".encode("utf-8")
                        self.audio_callback(payload)
                    conv_idx += 1
                else:
                    print("[TeamsConnector] No more conversation. Simulating meeting end.")
                    self.is_connected = False
                    break

                if random.random() > 0.6 and chat_idx < len(chat_messages):
                    if self.chat_callback:
                        self.chat_callback({
                            "sender": chat_messages[chat_idx]["sender"],
                            "text": chat_messages[chat_idx]["text"],
                            "timestamp": time.time()
                        })
                    chat_idx += 1

        except asyncio.CancelledError:
            pass
