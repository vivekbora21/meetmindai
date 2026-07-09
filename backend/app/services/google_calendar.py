import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import ConnectedAccount, Meeting, Provider, ScheduledMeeting
from app.integrations.registry import get_provider
from app.utils.encryption import decrypt_value

logger = logging.getLogger(__name__)


def parse_google_datetime(dt_str: str) -> datetime:
    """
    Parses ISO datetime strings returned by Google Calendar API and converts to UTC naive.
    """
    if not dt_str:
        return datetime.utcnow()
    
    # Handle YYYY-MM-DD all-day events
    if len(dt_str) == 10 and "-" in dt_str:
        try:
            return datetime.fromisoformat(dt_str)
        except Exception:
            return datetime.utcnow()

    # Normalize Z to +00:00
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1] + "+00:00"
        
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        try:
            # Strip timezone offsets if parsing failed
            if "+" in dt_str:
                dt_str = dt_str.split("+")[0]
            return datetime.fromisoformat(dt_str)
        except Exception:
            return datetime.utcnow()


class GoogleCalendarService:
    """
    Service to fetch calendar events from Google Calendar API and synchronize them into the local database.
    Only events containing Google Meet links are preserved.
    """

    def __init__(self):
        self._provider = get_provider("google")

    async def sync_calendar_events(self, db: Session, user_id: str) -> List[Meeting]:
        """
        Retrieves upcoming meetings for the next 30 days and syncs them in the database.
        Automatically handles access token refreshes if expired.
        """
        logger.info(
            f"Google Calendar Sync Requested: [User ID: {user_id}] [Provider Requested: {Provider.GOOGLE}]"
        )

        account = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == Provider.GOOGLE
        ).first()

        if not account:
            logger.warning(f"ConnectedAccount NOT found for User ID: {user_id}, Provider: {Provider.GOOGLE}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ConnectedAccount not found. Please connect your Google account first."
            )

        logger.info(
            f"ConnectedAccount Found: [Stored Provider: {account.provider}] [Stored User ID: {account.user_id}] "
            f"[Token Expiry: {account.expires_at}]"
        )

        # 1. Refresh token if expired or near expiry (within 60 seconds)
        if not account.expires_at or account.expires_at <= datetime.utcnow() + timedelta(seconds=60):
            logger.info(f"Google access token expired or near expiry for user {user_id}. Refreshing...")
            if not account.refresh_token:
                logger.error(f"Cannot refresh Google token for user {user_id}: refresh token is missing.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token failed: Google refresh token is missing."
                )

            try:
                new_tokens = await self._provider.refresh_access_token(account.refresh_token)
                from app.utils.encryption import encrypt_value
                account.access_token = encrypt_value(new_tokens["access_token"])
                if new_tokens.get("refresh_token"):
                    account.refresh_token = encrypt_value(new_tokens["refresh_token"])
                account.expires_at = datetime.utcnow() + timedelta(seconds=new_tokens.get("expires_in", 3600))
                account.connection_status = "Connected"
                db.commit()
                logger.info(f"Successfully refreshed and saved new Google tokens for user {user_id}.")
            except HTTPException as he:
                account.connection_status = "Expired"
                db.commit()
                logger.error(f"Failed to refresh Google tokens: {he.detail}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Google refresh token failed: {he.detail}"
                )
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error committing refreshed Google token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Google refresh token failed: Failed to save refreshed OAuth tokens."
                )

        decrypted_access_token = decrypt_value(account.access_token)
        if not decrypted_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google API Unauthorized: Access token is missing."
            )

        # 2. Call Google Calendar List Events API
        start_dt = datetime.utcnow()
        end_dt = start_dt + timedelta(days=30)
        time_min_str = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        time_max_str = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        params = {
            "timeMin": time_min_str,
            "timeMax": time_max_str,
            "singleEvents": "true",
            "orderBy": "startTime",
            "showDeleted": "true"  # Let's request deleted events as well to handle cancellations
        }

        headers = {
            "Authorization": f"Bearer {decrypted_access_token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, headers=headers, timeout=10.0)
                logger.info(f"Google Calendar Response Status: {response.status_code}")

                if response.status_code == 401:
                    logger.error("Google API Unauthorized: Expired token or invalid credentials.")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google Calendar API returned unauthorized status."
                    )
                elif response.status_code != 200:
                    error_msg = response.text or "Unknown Google API error"
                    logger.error(f"Google Calendar API Error: {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Google Calendar request failed: {error_msg}"
                    )

                events_data = response.json().get("items", [])
                logger.info(f"Retrieved {len(events_data)} calendar events from Google Calendar.")

                synced_meetings = []
                synced_event_ids = set()

                for ev in events_data:
                    provider_event_id = ev.get("id")
                    ev_status = ev.get("status")
                    hangout_link = ev.get("hangoutLink")

                    # Deduplication & filter list
                    if not provider_event_id:
                        continue

                    # If deleted or cancelled, or if it doesn't have Google Meet link
                    is_google_meet = hangout_link and ("meet.google.com" in hangout_link or "hangouts" in hangout_link)

                    # Check if we already have it in the database
                    meeting_record = db.query(Meeting).filter(
                        Meeting.organization_id == account.user.organization_id,
                        Meeting.provider == "google",
                        Meeting.provider_event_id == provider_event_id
                    ).first()

                    # Handle cancellation
                    if ev_status == "cancelled" or not is_google_meet:
                        if meeting_record:
                            # Update existing to Cancelled instead of deleting
                            meeting_record.sync_status = "cancelled"
                            meeting_record.join_status = "Cancelled"
                            meeting_record.status = "FAILED"
                            synced_meetings.append(meeting_record)
                        continue

                    # Parse fields
                    title = ev.get("summary") or "Untitled Meeting"
                    description = ev.get("description") or ""
                    organizer_email = ev.get("organizer", {}).get("email")

                    # Parse attendees list
                    attendees_raw = ev.get("attendees", [])
                    attendees_emails = [a.get("email") for a in attendees_raw if a.get("email")]

                    start_str_raw = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
                    end_str_raw = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date")
                    timezone = ev.get("start", {}).get("timeZone", "UTC")

                    if not start_str_raw or not end_str_raw:
                        continue

                    start_time = parse_google_datetime(start_str_raw)
                    end_time = parse_google_datetime(end_str_raw)

                    # Store as Meeting
                    if meeting_record:
                        meeting_record.title = title
                        meeting_record.description = description
                        meeting_record.meeting_date = start_time
                        meeting_record.meeting_url = hangout_link
                        meeting_record.organizer_email = organizer_email
                        meeting_record.attendees = attendees_emails
                        meeting_record.sync_status = "synced"
                        meeting_record.last_synced_at = datetime.utcnow()
                        # Only reset join_status if it is cancelled or scheduled
                        if meeting_record.join_status in ("Cancelled", "Scheduled"):
                            meeting_record.join_status = "Scheduled"
                    else:
                        meeting_record = Meeting(
                            organization_id=account.user.organization_id,
                            title=title,
                            description=description,
                            meeting_url=hangout_link,
                            platform="Google Meet",
                            meeting_date=start_time,
                            status="UPLOADED",  # Map to base status
                            provider="google",
                            provider_event_id=provider_event_id,
                            calendar_id="primary",
                            organizer_email=organizer_email,
                            attendees=attendees_emails,
                            sync_status="synced",
                            last_synced_at=datetime.utcnow(),
                            join_status="Scheduled"
                        )
                        db.add(meeting_record)

                    synced_event_ids.add(provider_event_id)
                    synced_meetings.append(meeting_record)

                # 3. Detect meetings deleted outside the API window (that were synced previously but not returned)
                # Query all active Google meetings in our db starting in the next 30 days
                existing_google_meetings = db.query(Meeting).filter(
                    Meeting.organization_id == account.user.organization_id,
                    Meeting.provider == "google",
                    Meeting.meeting_date >= start_dt,
                    Meeting.meeting_date <= end_dt
                ).all()

                for m in existing_google_meetings:
                    if m.provider_event_id not in synced_event_ids:
                        # Event has been deleted from Google Calendar, mark as cancelled
                        m.sync_status = "cancelled"
                        m.join_status = "Cancelled"
                        m.status = "FAILED"

                db.commit()

                for m in synced_meetings:
                    db.refresh(m)

                logger.info(f"Successfully synced and committed {len(synced_meetings)} Google Meet meetings for user {user_id}.")
                return synced_meetings

            except httpx.RequestError as exc:
                logger.error(f"Network error during Google calendar request: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google Calendar API servers."
                )
            except HTTPException as he:
                raise he
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error synchronizing Google calendar events: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Calendar synchronization failed: {e}"
                )
