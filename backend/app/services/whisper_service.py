import os
import torch
from typing import List, Dict, Any
from faster_whisper import WhisperModel
from app.config.settings import get_env


class WhisperService:
    def __init__(self):
        self.model_size = get_env("WHISPER_MODEL_SIZE", "base")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.compute_type = "float16" if self.device == "cuda" else "int8"
        self._model = None

    @property
    def model(self):
        if self._model is None:
            print(
                f"[Whisper] Loading model '{self.model_size}' on '{self.device}' with '{self.compute_type}'..."
            )
            self._model = WhisperModel(
                self.model_size, device=self.device, compute_type=self.compute_type
            )
        return self._model

    def transcribe(
        self, audio_path: str, forced_language: str = None
    ) -> List[Dict[str, Any]]:
        """
        Transcribes the audio file using faster-whisper with Silero VAD filter.
        Returns a list of segment dictionaries with start_ms, end_ms, speaker_tag, and text.
        """
        print(f"[Whisper] Transcribing {audio_path}...")
        if not os.path.exists(audio_path):
            raise FileNotFoundError(
                f"Audio file not found for transcription: {audio_path}"
            )

        try:
            lang_param = (
                forced_language
                if forced_language and forced_language.lower() != "auto"
                else None
            )
            # Transcribe with VAD filter active
            segments, info = self.model.transcribe(
                audio_path,
                language=lang_param,
                vad_filter=True,
                vad_parameters=dict(min_speech_duration_ms=250),
            )

            results = []
            segment_list = list(segments)

            # Improved pause-based diarization:
            # - Switch speaker when there's a pause > 0.8s (natural speaking turn gap)
            # - Use up to 4 speaker slots to capture more distinct voices
            # - Avoid flipping back immediately (require gap before switching again)
            speaker_slots = ["SPEAKER_00", "SPEAKER_01", "SPEAKER_02", "SPEAKER_03"]
            current_speaker_idx = 0
            last_end = 0.0
            min_gap_for_switch = 0.8  # seconds
            last_switch_end = 0.0
            min_gap_between_switches = 3.0  # don't switch more than once every 3s

            for i, segment in enumerate(segment_list):
                start_ms = int(segment.start * 1000)
                end_ms = int(segment.end * 1000)

                # Switch speaker on significant pause, but not too frequently
                gap = segment.start - last_end if last_end > 0 else 0
                time_since_last_switch = segment.start - last_switch_end
                if (
                    gap > min_gap_for_switch
                    and time_since_last_switch > min_gap_between_switches
                ):
                    current_speaker_idx = (current_speaker_idx + 1) % len(speaker_slots)
                    last_switch_end = segment.start

                results.append(
                    {
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                        "speaker_tag": speaker_slots[current_speaker_idx],
                        "text": segment.text.strip(),
                    }
                )

                last_end = segment.end

            print(f"[Whisper] Speech-to-Text Transcription Completed:")
            print(
                f"  - Detected Language: {info.language} (Probability: {info.language_probability:.2f})"
            )
            print(f"  - Total Audio Duration: {info.duration:.2f} seconds")
            print(f"  - Total Segments Extracted: {len(results)}")

            return results

        except Exception as e:
            print(f"[Whisper] Transcription failed: {e}")
            raise e

    def transcribe_stream(
        self, audio_path: str, forced_language: str = None, info_container: dict = None
    ):
        """
        Transcribes the audio file and yields each segment as it is produced.
        Optionally populates info_container with transcription metadata.
        """
        print(f"[Whisper] Transcribing incrementally {audio_path}...")
        if not os.path.exists(audio_path):
            raise FileNotFoundError(
                f"Audio file not found for transcription: {audio_path}"
            )

        lang_param = (
            forced_language
            if forced_language and forced_language.lower() != "auto"
            else None
        )
        segments, info = self.model.transcribe(
            audio_path,
            language=lang_param,
            vad_filter=True,
            vad_parameters=dict(min_speech_duration_ms=250),
        )

        if info_container is not None:
            info_container["language"] = info.language
            info_container["language_probability"] = info.language_probability
            info_container["duration"] = info.duration

        speaker_slots = ["SPEAKER_00", "SPEAKER_01", "SPEAKER_02", "SPEAKER_03"]
        current_speaker_idx = 0
        last_end = 0.0
        min_gap_for_switch = 0.8
        last_switch_end = 0.0
        min_gap_between_switches = 3.0

        for segment in segments:
            start_ms = int(segment.start * 1000)
            end_ms = int(segment.end * 1000)

            gap = segment.start - last_end if last_end > 0 else 0
            time_since_last_switch = segment.start - last_switch_end
            if (
                gap > min_gap_for_switch
                and time_since_last_switch > min_gap_between_switches
            ):
                current_speaker_idx = (current_speaker_idx + 1) % len(speaker_slots)
                last_switch_end = segment.start

            seg_dict = {
                "start_ms": start_ms,
                "end_ms": end_ms,
                "speaker_tag": speaker_slots[current_speaker_idx],
                "text": segment.text.strip(),
            }
            last_end = segment.end
            yield seg_dict
