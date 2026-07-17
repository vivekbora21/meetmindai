import logging
from datetime import datetime, timedelta, timezone
from typing import List
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import ConnectedAccount, CalendarEvent, Provider
from app.integrations.registry import get_provider
from app.utils.encryption import encrypt_value, decrypt_value

logger = logging.getLogger(__name__)


def parse_graph_datetime(dt_str: str) -> datetime:
    """
    Safely parses Microsoft Graph ISO datetime strings and converts to UTC naive.
    Handles 'Z' suffixes and trims excess microsecond decimals.
    """
    if not dt_str:
        return datetime.utcnow()

    # Normalize Z to +00:00
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1] + "+00:00"

    # Trim microsecond decimals if there are more than 6 digits
    if "." in dt_str:
        base, tz = dt_str.split(".", 1)
        import re

        match = re.search(r"(\d+)(Z|[+-]\d{2}:?\d{2})?", tz)
        if match:
            ms = match.group(1)[:6]
            offset = match.group(2) or ""
            if offset == "Z":
                offset = "+00:00"
            dt_str = f"{base}.{ms}{offset}"
        else:
            dt_str = base

    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        try:
            # Strip timezone offsets if it failed
            if "+" in dt_str:
                dt_str = dt_str.split("+")[0]
            return datetime.fromisoformat(dt_str)
        except Exception:
            return datetime.utcnow()


class MicrosoftCalendarService:
    """
    Service to fetch calendar events from Microsoft Graph API and synchronize them into the local database.
    """

    def __init__(self):
        self._provider = get_provider("microsoft")

    async def sync_calendar_events(
        self, db: Session, user_id: str
    ) -> List[CalendarEvent]:
        """
        Retrieves upcoming meetings for the next 30 days and syncs them in the database.
        Automatically handles access token refreshes if expired.
        """
        # Calendar Sync Structured Logging
        logger.debug(
            f"Calendar Sync Requested: [User ID: {user_id}] [Provider Requested: {Provider.MICROSOFT}]"
        )

        # 1. Fetch ConnectedAccount connection using user_id and provider
        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == Provider.MICROSOFT,
            )
            .first()
        )

        if not account:
            logger.warning(
                f"ConnectedAccount NOT found for User ID: {user_id}, Provider: {Provider.MICROSOFT}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ConnectedAccount not found. Please connect your Microsoft account first.",
            )

        logger.debug(
            f"ConnectedAccount Found: [Stored Provider: {account.provider}] [Stored User ID: {account.user_id}] "
            f"[Token Expiry: {account.expires_at}]"
        )

        # 2. Check token validity and refresh if expired or near expiry
        if (
            not account.expires_at
            or account.expires_at <= datetime.utcnow() + timedelta(seconds=60)
        ):
            logger.debug(
                f"Microsoft access token expired or near expiry for user {user_id}. Refreshing..."
            )
            if not account.refresh_token:
                logger.error(
                    f"Cannot refresh token for user {user_id}: refresh token is missing."
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token failed: Refresh token is missing.",
                )

            try:
                new_tokens = await self._provider.refresh_access_token(
                    account.refresh_token
                )
                account.access_token = encrypt_value(new_tokens["access_token"])
                if new_tokens.get("refresh_token"):
                    account.refresh_token = encrypt_value(new_tokens["refresh_token"])
                account.expires_at = datetime.utcnow() + timedelta(
                    seconds=new_tokens.get("expires_in", 3600)
                )
                account.token_type = new_tokens.get("token_type", "Bearer")
                account.connection_status = "Connected"
                db.commit()
                logger.debug(
                    f"Successfully refreshed and saved new Microsoft tokens for user {user_id}."
                )
            except HTTPException as he:
                account.connection_status = "Expired"
                db.commit()
                logger.error(f"Failed to refresh Microsoft tokens: {he.detail}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Refresh token failed: {he.detail}",
                )
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error committing refreshed token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Refresh token failed: Failed to save refreshed OAuth tokens.",
                )

        decrypted_access_token = decrypt_value(account.access_token)
        if not decrypted_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Graph API Unauthorized: Access token is missing.",
            )

        # 3. Call Microsoft Graph APIs to fetch and merge all calendars/channels
        start_dt = datetime.utcnow()
        end_dt = start_dt + timedelta(days=30)

        # Format as ISO 8601 UTC strings
        start_str = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_str = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        all_graph_events = []
        headers = {
            "Authorization": f"Bearer {decrypted_access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            # Step A: Fetch all user's personal calendars
            try:
                logger.debug(f"Listing all calendars for user {user_id}")
                cals_url = "https://graph.microsoft.com/v1.0/me/calendars"
                cals_resp = await client.get(cals_url, headers=headers, timeout=10.0)
                if cals_resp.status_code == 200:
                    calendars = cals_resp.json().get("value", [])
                    logger.debug(
                        f"Found {len(calendars)} personal calendars for user {user_id}"
                    )
                    for cal in calendars:
                        cal_id = cal.get("id")
                        cal_name = cal.get("name")
                        view_url = f"https://graph.microsoft.com/v1.0/me/calendars/{cal_id}/calendarView?startDateTime={start_str}&endDateTime={end_str}"
                        try:
                            view_resp = await client.get(
                                view_url, headers=headers, timeout=10.0
                            )
                            if view_resp.status_code == 200:
                                evs = view_resp.json().get("value", [])
                                logger.debug(
                                    f"Fetched {len(evs)} events from calendar '{cal_name}'"
                                )
                                all_graph_events.extend(evs)
                            else:
                                logger.warning(
                                    f"Failed to fetch calendarView for calendar '{cal_name}': {view_resp.status_code}"
                                )
                        except Exception as e:
                            logger.error(
                                f"Error fetching calendarView for calendar '{cal_name}': {e}"
                            )
                else:
                    logger.warning(
                        f"Failed to list user calendars: {cals_resp.status_code}, falling back to primary calendarView"
                    )
                    fallback_url = f"https://graph.microsoft.com/v1.0/me/calendarView?startDateTime={start_str}&endDateTime={end_str}"
                    fb_resp = await client.get(
                        fallback_url, headers=headers, timeout=10.0
                    )
                    if fb_resp.status_code == 200:
                        all_graph_events.extend(fb_resp.json().get("value", []))
            except Exception as e:
                logger.error(
                    f"Error checking user calendars: {e}, falling back to primary calendarView"
                )
                fallback_url = f"https://graph.microsoft.com/v1.0/me/calendarView?startDateTime={start_str}&endDateTime={end_str}"
                try:
                    fb_resp = await client.get(
                        fallback_url, headers=headers, timeout=10.0
                    )
                    if fb_resp.status_code == 200:
                        all_graph_events.extend(fb_resp.json().get("value", []))
                except Exception as ex:
                    logger.error(f"Fallback primary calendarView failed: {ex}")

            # Step B: Fetch all user's joined Teams groups (to capture Team channel meetings)
            try:
                is_personal = False
                if account.email:
                    email_lower = account.email.lower()
                    personal_domains = (
                        "@outlook.",
                        "@hotmail.",
                        "@live.",
                        "@msn.",
                        "@passport.",
                        "@gmail.com",
                        "@yahoo.com",
                        "@icloud.com",
                        "@aol.com",
                        "@mail.com",
                        "@protonmail.com",
                        "@proton.me",
                        "@zoho.com",
                    )
                    if any(dom in email_lower for dom in personal_domains):
                        is_personal = True

                if is_personal:
                    logger.debug(
                        f"Skipping Teams groups sync for user {user_id} (not supported for personal accounts: {account.email})"
                    )
                else:
                    logger.debug(f"Listing joined Teams groups for user {user_id}")
                    teams_url = "https://graph.microsoft.com/v1.0/me/joinedTeams"
                    teams_resp = await client.get(
                        teams_url, headers=headers, timeout=10.0
                    )
                    if teams_resp.status_code == 200:
                        teams = teams_resp.json().get("value", [])
                        logger.debug(
                            f"Found {len(teams)} joined Teams/Groups for user {user_id}"
                        )
                        for team in teams:
                            team_id = team.get("id")
                            team_name = team.get("displayName")
                            # Fetch group calendarView
                            team_view_url = f"https://graph.microsoft.com/v1.0/groups/{team_id}/calendar/calendarView?startDateTime={start_str}&endDateTime={end_str}"
                            try:
                                t_resp = await client.get(
                                    team_view_url, headers=headers, timeout=10.0
                                )
                                if t_resp.status_code == 200:
                                    t_evs = t_resp.json().get("value", [])
                                    logger.debug(
                                        f"Fetched {len(t_evs)} events from Teams Group '{team_name}'"
                                    )
                                    all_graph_events.extend(t_evs)
                                else:
                                    logger.warning(
                                        f"Failed to fetch calendarView for Teams Group '{team_name}' (Status {t_resp.status_code})"
                                    )
                            except Exception as e:
                                logger.error(
                                    f"Error fetching calendarView for Teams Group '{team_name}': {e}"
                                )
                    else:
                        error_msg = ""
                        try:
                            err_json = teams_resp.json()
                            error_msg = err_json.get("error", {}).get("message", "")
                        except Exception:
                            pass

                        log_msg = (
                            f"Failed to list joined Teams: {teams_resp.status_code}"
                        )
                        if error_msg:
                            log_msg += f" - {error_msg}"
                        if teams_resp.status_code == 403:
                            log_msg += " (Note: Teams/Groups API requires the 'Team.ReadBasic.All' scope and is not supported for personal Microsoft accounts like outlook.com/hotmail.com)"
                            logger.debug(log_msg)
                        else:
                            logger.warning(log_msg)
            except Exception as e:
                logger.error(f"Error checking joined Teams groups: {e}")

            # Step C: Save, update, and deduplicate all fetched calendar events
            try:
                synced_events = []
                # Keep track of unique events in-memory to prevent duplicates in the same sync loop
                seen_events = set()

                for ev in all_graph_events:
                    provider_event_id = ev.get("id")
                    title = ev.get("subject") or "No Title"
                    description = ev.get("bodyPreview") or ""

                    start_str_raw = ev.get("start", {}).get("dateTime")
                    end_str_raw = ev.get("end", {}).get("dateTime")
                    timezone = ev.get("start", {}).get("timeZone", "UTC")

                    if not start_str_raw or not end_str_raw:
                        continue

                    start_time = parse_graph_datetime(start_str_raw)
                    end_time = parse_graph_datetime(end_str_raw)

                    # Deduplicate in-memory to prevent duplicating cards for the same slot and title
                    event_key = (title, start_time, end_time)
                    if event_key in seen_events:
                        continue
                    seen_events.add(event_key)

                    organizer_email = (
                        ev.get("organizer", {}).get("emailAddress", {}).get("address")
                    )

                    # Parse attendees list
                    attendees_raw = ev.get("attendees", [])
                    attendees_parsed = []
                    for att in attendees_raw:
                        email_addr = att.get("emailAddress", {})
                        name = email_addr.get("name")
                        email = email_addr.get("address")
                        if email:
                            attendees_parsed.append(
                                {
                                    "name": name or email.split("@")[0],
                                    "email": email,
                                    "response": att.get("status", {}).get(
                                        "response", "none"
                                    ),
                                }
                            )

                    # Parse online meeting details
                    online_meeting = ev.get("onlineMeeting", {})
                    join_url = online_meeting.get("joinUrl") or ev.get(
                        "onlineMeetingUrl"
                    )
                    meeting_provider = ev.get("onlineMeetingProvider")
                    is_online_meeting = ev.get("isOnlineMeeting", False) or (
                        join_url is not None
                    )
                    status_str = ev.get("status") or ev.get("showAs") or "unknown"

                    # 1. Check if event already exists using exact user_id, provider, and provider_event_id
                    event_record = (
                        db.query(CalendarEvent)
                        .filter(
                            CalendarEvent.user_id == user_id,
                            CalendarEvent.provider == Provider.MICROSOFT,
                            CalendarEvent.provider_event_id == provider_event_id,
                        )
                        .first()
                    )

                    # 2. Fallback check: check if there is an existing event with matching title, start_time, and end_time
                    if not event_record:
                        event_record = (
                            db.query(CalendarEvent)
                            .filter(
                                CalendarEvent.user_id == user_id,
                                CalendarEvent.provider == Provider.MICROSOFT,
                                CalendarEvent.title == title,
                                CalendarEvent.start_time == start_time,
                                CalendarEvent.end_time == end_time,
                            )
                            .first()
                        )

                    # Check if it's an online meeting. If not, skip it.
                    if not is_online_meeting:
                        if status_str == "cancelled" and event_record:
                            event_record.status = "cancelled"
                            synced_events.append(event_record)
                        continue

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
                        event_record.status = status_str
                        event_record.attendees = attendees_parsed
                    else:
                        event_record = CalendarEvent(
                            user_id=user_id,
                            provider=Provider.MICROSOFT,
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
                            status=status_str,
                            attendees=attendees_parsed,
                        )
                        db.add(event_record)

                    synced_events.append(event_record)

                db.commit()

                # Refresh records to get primary keys & populated fields
                for e in synced_events:
                    db.refresh(e)

                logger.debug(
                    f"Successfully synced and committed {len(synced_events)} total events for user {user_id}."
                )
                return synced_events

            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error synchronizing calendar events: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"An unexpected error occurred during calendar synchronization: {str(e)}",
                )
