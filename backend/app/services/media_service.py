import os
import glob
import shutil
import subprocess
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.models.models import Meeting


class MediaService:
    @staticmethod
    def get_uploads_dir() -> str:
        """Returns the absolute path to the uploads directory."""
        # Find absolute path relative to this file
        base_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        return os.path.join(base_dir, "app", "uploads")

    def verify_recording_exists(self, db: Session, meeting_id: str) -> Optional[str]:
        """
        Verifies if a recording file exists for the meeting.
        Checks meeting.recording_url first, then falls back to checking any file starting with meeting_id in uploads.
        Returns the absolute local file path if exists, otherwise None.
        """
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return None

        uploads_dir = self.get_uploads_dir()

        # Check recording_url
        if meeting.recording_url:
            filename = os.path.basename(meeting.recording_url)
            candidate_path = os.path.join(uploads_dir, filename)
            if os.path.exists(candidate_path) and os.path.isfile(candidate_path):
                return candidate_path

        # Check in uploads directory for any file starting with meeting_id
        files = glob.glob(os.path.join(uploads_dir, f"{meeting_id}.*"))
        if files:
            # Sort to filter out tiny files or temp files if any, prioritizing the largest/newest
            files_by_size = sorted(files, key=os.path.getsize, reverse=True)
            for f in files_by_size:
                if os.path.exists(f) and os.path.isfile(f) and os.path.getsize(f) > 100:
                    return f

        return None

    def save_uploaded_file(
        self, file: UploadFile, meeting: Meeting, db: Session
    ) -> str:
        """
        Saves the uploaded file to the uploads directory, populates metadata on the Meeting,
        and commits the database session.
        """
        uploads_dir = self.get_uploads_dir()
        os.makedirs(uploads_dir, exist_ok=True)
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{meeting.id}{file_extension}"
        saved_file_path = os.path.join(uploads_dir, unique_filename)

        try:
            with open(saved_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Save file metadata/URL in database
            meeting.recording_url = f"/uploads/{unique_filename}"
            meeting.original_filename = file.filename
            meeting.content_type = file.content_type
            meeting.file_size = os.path.getsize(saved_file_path)
            db.commit()
            return saved_file_path
        except Exception as e:
            db.rollback()
            raise e

    def extract_audio(self, input_path: str, output_path: str) -> bool:
        """
        Extracts 16kHz mono audio from a media file using FFmpeg.
        """
        print(f"[FFmpeg] Extracting audio from {input_path} to {output_path}...")
        if not os.path.exists(input_path):
            print(f"[FFmpeg] Input file does not exist: {input_path}")
            return False

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
            result = subprocess.run(
                command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
            )
            return True
        except subprocess.CalledProcessError as e:
            stderr_output = e.stderr.decode() if e.stderr else "unknown error"
            print(f"[FFmpeg] Audio extraction failed: {stderr_output}")
            return False
        except Exception as e:
            print(f"[FFmpeg] Unexpected error during audio extraction: {e}")
            return False
