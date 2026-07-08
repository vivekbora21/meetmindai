# Speaker Service wrapper
from app.services.transcription.speaker_diarization import SpeakerDiarizationService
from app.services.transcription.speaker_mapping import SpeakerMappingService


class SpeakerService:
    def __init__(self):
        self.diarizer = SpeakerDiarizationService()
        self.mapper = SpeakerMappingService()
