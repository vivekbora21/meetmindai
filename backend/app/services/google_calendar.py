import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    ConnectedAccount,
    Meeting,
    Provider,
    ScheduledMeeting,
    CalendarEvent,
)
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
        logger.debug(
            f"Google Calendar Sync Requested: [User ID: {user_id}] [Provider Requested: {Provider.GOOGLE}]"
        )

        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == Provider.GOOGLE,
            )
            .first()
        )

        if not account:
            logger.warning(
                f"ConnectedAccount NOT found for User ID: {user_id}, Provider: {Provider.GOOGLE}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ConnectedAccount not found. Please connect your Google account first.",
            )

        logger.debug(
            f"ConnectedAccount Found: [Stored Provider: {account.provider}] [Stored User ID: {account.user_id}] "
            f"[Token Expiry: {account.expires_at}]"
        )

        # 1. Refresh token if expired or near expiry (within 60 seconds)
        if (
            not account.expires_at
            or account.expires_at <= datetime.utcnow() + timedelta(seconds=60)
        ):
            logger.debug(
                f"Google access token expired or near expiry for user {user_id}. Refreshing..."
            )
            if not account.refresh_token:
                logger.error(
                    f"Cannot refresh Google token for user {user_id}: refresh token is missing."
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token failed: Google refresh token is missing.",
                )

            try:
                new_tokens = await self._provider.refresh_access_token(
                    account.refresh_token
                )
                from app.utils.encryption import encrypt_value

                account.access_token = encrypt_value(new_tokens["access_token"])
                if new_tokens.get("refresh_token"):
                    account.refresh_token = encrypt_value(new_tokens["refresh_token"])
                account.expires_at = datetime.utcnow() + timedelta(
                    seconds=new_tokens.get("expires_in", 3600)
                )
                account.connection_status = "Connected"
                db.commit()
                logger.debug(
                    f"Successfully refreshed and saved new Google tokens for user {user_id}."
                )
            except HTTPException as he:
                account.connection_status = "Expired"
                db.commit()
                logger.error(f"Failed to refresh Google tokens: {he.detail}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Google refresh token failed: {he.detail}",
                )
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error committing refreshed Google token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Google refresh token failed: Failed to save refreshed OAuth tokens.",
                )

        decrypted_access_token = decrypt_value(account.access_token)
        if not decrypted_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google API Unauthorized: Access token is missing.",
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
            "showDeleted": "true",  # Let's request deleted events as well to handle cancellations
        }

        headers = {
            "Authorization": f"Bearer {decrypted_access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url, params=params, headers=headers, timeout=10.0
                )
                logger.debug(f"Google Calendar Response Status: {response.status_code}")

                if response.status_code == 401:
                    logger.error(
                        "Google API Unauthorized: Expired token or invalid credentials."
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google Calendar API returned unauthorized status.",
                    )
                elif response.status_code != 200:
                    error_msg = response.text or "Unknown Google API error"
                    logger.error(f"Google Calendar API Error: {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Google Calendar request failed: {error_msg}",
                    )

                events_data = response.json().get("items", [])
                logger.debug(
                    f"Retrieved {len(events_data)} calendar events from Google Calendar."
                )

                synced_meetings = []
                synced_event_ids = set()

                for ev in events_data:
                    provider_event_id = ev.get("id")
                    ev_status = ev.get("status")
                    hangout_link = ev.get("hangoutLink")

                    # Deduplication & filter list
                    if not provider_event_id:
                        continue

                    title = ev.get("summary") or "Untitled Meeting"
                    description = ev.get("description") or ""
                    organizer_email = ev.get("organizer", {}).get("email")

                    # Parse attendees list for CalendarEvent (detailed dict structure)
                    attendees_raw = ev.get("attendees", [])
                    attendees_parsed = []
                    for att in attendees_raw:
                        email = att.get("email")
                        if email:
                            attendees_parsed.append(
                                {
                                    "name": att.get("displayName")
                                    or email.split("@")[0],
                                    "email": email,
                                    "response": att.get("responseStatus", "none"),
                                }
                            )

                    attendees_emails = [
                        a.get("email") for a in attendees_raw if a.get("email")
                    ]

                    start_str_raw = ev.get("start", {}).get("dateTime") or ev.get(
                        "start", {}
                    ).get("date")
                    end_str_raw = ev.get("end", {}).get("dateTime") or ev.get(
                        "end", {}
                    ).get("date")
                    timezone = ev.get("start", {}).get("timeZone", "UTC")

                    if not start_str_raw or not end_str_raw:
                        continue

                    start_time = parse_google_datetime(start_str_raw)
                    end_time = parse_google_datetime(end_str_raw)

                    is_online_meeting = False
                    meeting_provider = None
                    join_url = hangout_link

                    # Check conferenceData first
                    conf_data = ev.get("conferenceData", {})
                    entry_points = conf_data.get("entryPoints", [])
                    for ep in entry_points:
                        if ep.get("entryPointType") == "video" and ep.get("uri"):
                            join_url = ep.get("uri")
                            is_online_meeting = True
                            break

                    if join_url:
                        is_online_meeting = True

                    # Also check location and description for URLs
                    loc = ev.get("location") or ""
                    desc = ev.get("description") or ""

                    url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')

                    # Search in join_url, location, and description for signatures
                    found_url = None
                    for text in [join_url, loc, desc]:
                        if not text:
                            continue
                        urls = url_pattern.findall(text)
                        for u in urls:
                            u_lower = u.lower()
                            if (
                                "meet.google.com" in u_lower
                                or "hangouts.google.com" in u_lower
                            ):
                                found_url = u
                                meeting_provider = "Google Meet"
                                is_online_meeting = True
                                break
                            elif "zoom.us" in u_lower:
                                found_url = u
                                meeting_provider = "Zoom"
                                is_online_meeting = True
                                break
                            elif (
                                "teams.microsoft.com" in u_lower
                                or "teams.live.com" in u_lower
                            ):
                                found_url = u
                                meeting_provider = "Teams"
                                is_online_meeting = True
                                break
                        if is_online_meeting and found_url:
                            break

                    if is_online_meeting:
                        if found_url:
                            join_url = found_url
                        if not meeting_provider:
                            # Try to identify provider from join_url
                            j_lower = join_url.lower() if join_url else ""
                            if "meet.google.com" in j_lower or "hangouts" in j_lower:
                                meeting_provider = "Google Meet"
                            elif "zoom" in j_lower:
                                meeting_provider = "Zoom"
                            elif "teams" in j_lower:
                                meeting_provider = "Teams"
                            else:
                                meeting_provider = "Online Meeting"

                    # If not an online meeting and not cancelled, skip it completely
                    if not is_online_meeting and ev_status != "cancelled":
                        continue

                    # 1. Sync CalendarEvent
                    event_record = (
                        db.query(CalendarEvent)
                        .filter(
                            CalendarEvent.user_id == user_id,
                            CalendarEvent.provider == Provider.GOOGLE,
                            CalendarEvent.provider_event_id == provider_event_id,
                        )
                        .first()
                    )

                    if not event_record:
                        event_record = (
                            db.query(CalendarEvent)
                            .filter(
                                CalendarEvent.user_id == user_id,
                                CalendarEvent.provider == Provider.GOOGLE,
                                CalendarEvent.title == title,
                                CalendarEvent.start_time == start_time,
                                CalendarEvent.end_time == end_time,
                            )
                            .first()
                        )

                    if ev_status == "cancelled":
                        if event_record:
                            event_record.status = "cancelled"
                    else:
                        if event_record:
                            event_record.title = title
                            event_record.description = description
                            event_record.start_time = start_time
                            event_record.end_time = end_time
                            event_record.timezone = timezone
                            event_record.organizer_email = organizer_email
                            event_record.join_url = join_url
                            event_record.meeting_provider = meeting_provider
                            event_record.is_online_meeting = is_online_meeting
                            event_record.status = ev_status
                            event_record.attendees = attendees_parsed
                        else:
                            event_record = CalendarEvent(
                                user_id=user_id,
                                provider=Provider.GOOGLE,
                                provider_event_id=provider_event_id,
                                title=title,
                                description=description,
                                start_time=start_time,
                                end_time=end_time,
                                timezone=timezone,
                                organizer_email=organizer_email,
                                join_url=join_url,
                                meeting_provider=meeting_provider,
                                is_online_meeting=is_online_meeting,
                                status=ev_status,
                                attendees=attendees_parsed,
                            )
                            db.add(event_record)

                    # 2. Sync Meeting (only for actual online meetings)
                    meeting_record = (
                        db.query(Meeting)
                        .filter(
                            Meeting.organization_id == account.user.organization_id,
                            Meeting.provider == "google",
                            Meeting.provider_event_id == provider_event_id,
                        )
                        .first()
                    )

                    if ev_status == "cancelled" or not is_online_meeting:
                        if meeting_record:
                            meeting_record.sync_status = "cancelled"
                            meeting_record.join_status = "Cancelled"
                            meeting_record.status = "FAILED"
                            synced_meetings.append(meeting_record)
                        continue

                    if meeting_record:
                        meeting_record.title = title
                        meeting_record.description = description
                        meeting_record.meeting_date = start_time
                        meeting_record.meeting_url = join_url
                        meeting_record.organizer_email = organizer_email
                        meeting_record.attendees = attendees_emails
                        meeting_record.sync_status = "synced"
                        meeting_record.last_synced_at = datetime.utcnow()
                        if meeting_record.join_status in ("Cancelled", "Scheduled"):
                            meeting_record.join_status = "Scheduled"
                    else:
                        meeting_record = Meeting(
                            organization_id=account.user.organization_id,
                            title=title,
                            description=description,
                            meeting_url=join_url,
                            platform=meeting_provider or "Google Meet",
                            meeting_date=start_time,
                            status="UPLOADED",
                            provider="google",
                            provider_event_id=provider_event_id,
                            calendar_id="primary",
                            organizer_email=organizer_email,
                            attendees=attendees_emails,
                            sync_status="synced",
                            last_synced_at=datetime.utcnow(),
                            join_status="Scheduled",
                        )
                        db.add(meeting_record)

                    synced_event_ids.add(provider_event_id)
                    synced_meetings.append(meeting_record)

                # 3. Detect meetings deleted outside the API window (that were synced previously but not returned)
                # Query all active Google meetings in our db starting in the next 30 days
                existing_google_meetings = (
                    db.query(Meeting)
                    .filter(
                        Meeting.organization_id == account.user.organization_id,
                        Meeting.provider == "google",
                        Meeting.meeting_date >= start_dt,
                        Meeting.meeting_date <= end_dt,
                    )
                    .all()
                )

                for m in existing_google_meetings:
                    if m.provider_event_id not in synced_event_ids:
                        # Event has been deleted from Google Calendar, mark as cancelled
                        m.sync_status = "cancelled"
                        m.join_status = "Cancelled"
                        m.status = "FAILED"

                # Also mark CalendarEvent rows as cancelled
                existing_google_events = (
                    db.query(CalendarEvent)
                    .filter(
                        CalendarEvent.user_id == user_id,
                        CalendarEvent.provider == Provider.GOOGLE,
                        CalendarEvent.start_time >= start_dt,
                        CalendarEvent.start_time <= end_dt,
                    )
                    .all()
                )

                for e in existing_google_events:
                    if e.provider_event_id not in synced_event_ids:
                        e.status = "cancelled"

                db.commit()

                for m in synced_meetings:
                    db.refresh(m)

                logger.debug(
                    f"Successfully synced and committed {len(synced_meetings)} Google Meet meetings for user {user_id}."
                )
                return synced_meetings

            except httpx.RequestError as exc:
                logger.error(f"Network error during Google calendar request: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google Calendar API servers.",
                )
            except HTTPException as he:
                raise he
            except Exception as e:
                db.rollback()
                logger.error(
                    f"Unexpected error synchronizing Google calendar events: {e}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Calendar synchronization failed: {e}",
                )
