from enum import Enum


class Provider(str, Enum):
    MICROSOFT = "microsoft"
    GOOGLE = "google"
    ZOOM = "zoom"
    SLACK = "slack"
    DISCORD = "discord"
    WEBEX = "webex"


class MeetingStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    TRANSCRIBED = "TRANSCRIBED"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

    @classmethod
    def processing_values(cls) -> list[str]:
        return [
            "PROCESSING",
            "TRANSCRIBED",
            "ANALYZING",
            "Processing",
            "Transcribed",
            "Analyzing",
            "processing",
            "transcribed",
            "analyzing",
        ]

    @classmethod
    def uploaded_values(cls) -> list[str]:
        return ["UPLOADED", "Uploaded", "uploaded"]


class AIStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"

    @classmethod
    def active_values(cls) -> list[str]:
        return ["RUNNING", "PENDING", "running", "pending", "Running", "Pending"]


class Platform(str, Enum):
    UPLOAD = "Upload"
    GOOGLE_MEET = "Google Meet"
    TEAMS = "Teams"
    ZOOM = "Zoom"


class UserRole(str, Enum):
    ADMIN = "Admin"
    MEMBER = "Member"
    OBSERVER = "Observer"
