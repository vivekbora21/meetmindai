import os
import subprocess
import torch
from typing import List, Dict, Any
from faster_whisper import WhisperModel
from app.config.settings import get_env


class TranscriptionService:
    def __init__(self):
        self.model_size = get_env(
            "WHISPER_MODEL_SIZE", "base"
        )  # Default to 'base' for faster CPU runs, 'large-v3' in prod
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

    def extract_audio(self, input_path: str, output_path: str) -> bool:
        """
        Extracts 16kHz mono audio from a media file using FFmpeg.
        """
        print(f"[FFmpeg] Extracting audio from {input_path} to {output_path}...")
        try:
            command = [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                output_path,
            ]
            # Run command and capture output
            result = subprocess.run(
                command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
            )
            return True
        except subprocess.CalledProcessError as e:
            print(f"[FFmpeg] Audio extraction failed: {e.stderr.decode()}")
            return False
        except Exception as e:
            print(f"[FFmpeg] Unexpected error during audio extraction: {e}")
            return False

    def transcribe(self, audio_path: str) -> List[Dict[str, Any]]:
        """
        Transcribes the audio file using faster-whisper with Silero VAD filter.
        Returns a list of segment dictionaries with start_ms, end_ms, speaker_tag, and text.
        """
        print(f"[Whisper] Transcribing {audio_path}...")
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        try:
            # Transcribe with VAD filter active
            segments, info = self.model.transcribe(
                audio_path,
                vad_filter=True,
                vad_parameters=dict(min_speech_duration_ms=250),
            )

            results = []
            segment_list = list(segments)

            # Basic fallback diarization: we label speaker based on alternating turns or pause gaps
            # If pyannote is not configured, we alternate speaker tags when there's a pause > 1.5 seconds.
            current_speaker = "SPEAKER_00"
            last_end = 0.0

            for i, segment in enumerate(segment_list):
                start_ms = int(segment.start * 1000)
                end_ms = int(segment.end * 1000)

                # Check for speaker turn based on pause duration
                if last_end > 0 and (segment.start - last_end) > 1.5:
                    current_speaker = (
                        "SPEAKER_01"
                        if current_speaker == "SPEAKER_00"
                        else "SPEAKER_00"
                    )

                results.append(
                    {
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                        "speaker_tag": current_speaker,
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

            print("[Whisper] Segment Log Preview:")
            for idx, r in enumerate(results[:20]):
                start_sec = r["start_ms"] / 1000.0
                end_sec = r["end_ms"] / 1000.0
                print(
                    f"    Segment #{idx+1} [{start_sec:.2f}s - {end_sec:.2f}s] {r['speaker_tag']}: {r['text']}"
                )
            if len(results) > 20:
                print(f"    ... and {len(results) - 20} more segments.")

            print("result ::::::::", results)
            return results

        except Exception as e:
            print(f"[Whisper] Transcription failed: {e}")
            raise e
