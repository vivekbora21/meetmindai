import asyncio
import time
from typing import Callable, Optional

class RealtimeSpeechPipeline:
    """
    Simulated streaming audio pipeline. Handles VAD (Voice Activity Detection),
    transcription buffering, intent parsing, and emits structured events.
    """
    def __init__(self, meeting_id: str, on_segment_extracted: Callable[[dict], None]):
        self.meeting_id = meeting_id
        self.on_segment_extracted = on_segment_extracted
        self.is_active = False

    def start(self):
        self.is_active = True
        print(f"[SpeechPipeline] Started streaming STT pipeline for meeting: {self.meeting_id}")

    def stop(self):
        self.is_active = False
        print(f"[SpeechPipeline] Stopped streaming STT pipeline.")

    def process_audio_chunk(self, chunk: bytes):
        """
        Receives raw audio chunk PCM bytes, performs voice activity detection,
        runs STT, and fires callback on completed speech segments.
        """
        if not self.is_active:
            return

        try:
            # Decode the packed metadata from our connector simulator
            decoded = chunk.decode("utf-8")
            parts = decoded.split("|")
            if len(parts) == 2:
                speaker, text = parts[0], parts[1]
                
                # Emit segment immediately
                event_data = {
                    "meeting_id": self.meeting_id,
                    "speaker": speaker,
                    "text": text,
                    "timestamp": time.time(),
                    "confidence": 0.98
                }
                
                # Fire async/sync callback
                self.on_segment_extracted(event_data)
        except Exception as e:
            # If not a simulated text chunk, we would process standard PCM bytes here
            pass
