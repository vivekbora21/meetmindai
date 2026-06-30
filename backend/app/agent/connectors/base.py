from abc import ABC, abstractmethod
from typing import Callable, Dict, Any, Optional

class MeetingConnector(ABC):
    """
    Abstract base class defining the interfaces for connecting to live meetings
    such as Microsoft Teams, Google Meet, and Zoom.
    """

    @abstractmethod
    def join_meeting(self, meeting_url: str, options: Optional[Dict[str, Any]] = None) -> None:
        """Join a meeting as a silent note-taker bot."""
        pass

    @abstractmethod
    def leave_meeting(self) -> None:
        """Gracefully disconnect and leave the meeting room."""
        pass

    @abstractmethod
    def detect_meeting_end(self) -> bool:
        """Return True if the meeting has ended or is empty."""
        pass

    @abstractmethod
    def receive_audio(self, callback: Callable[[bytes], None]) -> None:
        """Register a callback for raw PCM audio stream packets."""
        pass

    @abstractmethod
    def receive_chat_messages(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Register a callback for meeting chat logs."""
        pass

    @abstractmethod
    def receive_participant_events(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Register a callback for participant join/leave events."""
        pass
