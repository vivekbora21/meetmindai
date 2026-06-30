import asyncio
import time
from typing import Callable, Dict, Any, Optional
from app.agent.connectors.base import MeetingConnector

class ZoomConnector(MeetingConnector):
    """
    Zoom Connector simulator. Mimics Web SDK token auth and room joins.
    """
    def __init__(self):
        self.meeting_url = None
        self.is_connected = False
        self.audio_callback = None
        self.chat_callback = None
        self.participant_callback = None
        self._loop_task = None
        self.participants = ["Vivek Sharma", "Alex Rivera"]

    def join_meeting(self, meeting_url: str, options: Optional[Dict[str, Any]] = None) -> None:
        self.meeting_url = meeting_url
        self.is_connected = True
        print(f"[ZoomConnector] Joining Zoom Meeting room: {meeting_url}")
        self._loop_task = asyncio.create_task(self._simulate_meeting_activity())

    def leave_meeting(self) -> None:
        self.is_connected = False
        if self._loop_task:
            self._loop_task.cancel()
        print("[ZoomConnector] Disconnected from Zoom session.")

    def detect_meeting_end(self) -> bool:
        return not self.is_connected

    def receive_audio(self, callback: Callable[[bytes], None]) -> None:
        self.audio_callback = callback

    def receive_chat_messages(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        self.chat_callback = callback

    def receive_participant_events(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        self.participant_callback = callback

    async def _simulate_meeting_activity(self):
        try:
            if self.participant_callback:
                for p in self.participants:
                    self.participant_callback({"event": "join", "name": p, "timestamp": time.time()})
                    await asyncio.sleep(0.5)

            conversations = [
                ("Vivek Sharma", "Starting our Zoom SDK sync. We need to verify that meeting disconnect events are triggered correctly."),
                ("Alex Rivera", "Yes, when Zoom's host closes the room, our SDK triggers a 'connection-closed' event, which handles clean exits."),
                ("Vivek Sharma", "Excellent. That will clean up our agent instances on the server side instantly.")
            ]

            conv_idx = 0
            while self.is_connected:
                await asyncio.sleep(5.0)
                if not self.is_connected:
                    break

                if conv_idx < len(conversations):
                    speaker, phrase = conversations[conv_idx]
                    print(f"[ZoomConnector] Speaker {speaker} is talking: '{phrase}'")
                    if self.audio_callback:
                        payload = f"{speaker}|{phrase}".encode("utf-8")
                        self.audio_callback(payload)
                    conv_idx += 1
                else:
                    self.is_connected = False
                    break

        except asyncio.CancelledError:
            pass
