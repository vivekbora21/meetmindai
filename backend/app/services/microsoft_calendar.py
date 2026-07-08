import logging
from datetime import datetime, timedelta
from typing import List
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import ConnectedAccount, CalendarEvent, Provider
from app.services.microsoft_oauth import MicrosoftOAuthService
from app.utils.encryption import encrypt_value, decrypt_value


logger = logging.getLogger(__name__)


def parse_graph_datetime(dt_str: str) -> datetime:
    """
    Safely parses Microsoft Graph ISO datetime strings.
    Handles 'Z' suffixes and trims excess microsecond decimals.
    """
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1]
    if "." in dt_str:
        base, ms = dt_str.split(".", 1)
        ms = ms[:6]
        dt_str = f"{base}.{ms}"
    return datetime.fromisoformat(dt_str)


class MicrosoftCalendarService:
    """
    Service to fetch calendar events from Microsoft Graph API and synchronize them into the local database.
    """

    def __init__(self):
        self.oauth_service = MicrosoftOAuthService()

    async def sync_calendar_events(self, db: Session, user_id: str) -> List[CalendarEvent]:
        """
        Retrieves upcoming meetings for the next 30 days and syncs them in the database.
        Automatically handles access token refreshes if expired.
        """
        # Calendar Sync Structured Logging
        logger.info(
            f"Calendar Sync Requested: [User ID: {user_id}] [Provider Requested: {Provider.MICROSOFT}]"
        )

        # 1. Fetch ConnectedAccount connection using user_id and provider
        account = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == Provider.MICROSOFT
        ).first()

        if not account:
            logger.warning(
                f"ConnectedAccount NOT found for User ID: {user_id}, Provider: {Provider.MICROSOFT}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ConnectedAccount not found. Please connect your Microsoft account first."
            )

        logger.info(
            f"ConnectedAccount Found: [Stored Provider: {account.provider}] [Stored User ID: {account.user_id}] "
            f"[Token Expiry: {account.expires_at}]"
        )

        # 2. Check token validity and refresh if expired or near expiry
        if not account.expires_at or account.expires_at <= datetime.utcnow() + timedelta(seconds=60):
            logger.info(f"Microsoft access token expired or near expiry for user {user_id}. Refreshing...")
            if not account.refresh_token:
                logger.error(f"Cannot refresh token for user {user_id}: refresh token is missing.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token failed: Refresh token is missing."
                )

            try:
                new_tokens = await self.oauth_service.refresh_tokens(account.refresh_token)
                account.access_token = encrypt_value(new_tokens["access_token"])
                if new_tokens.get("refresh_token"):
                    account.refresh_token = encrypt_value(new_tokens["refresh_token"])
                account.expires_at = datetime.utcnow() + timedelta(seconds=new_tokens.get("expires_in", 3600))
                account.token_type = new_tokens.get("token_type", "Bearer")
                account.connection_status = "Connected"
                db.commit()
                logger.info(f"Successfully refreshed and saved new Microsoft tokens for user {user_id}.")
            except HTTPException as he:
                account.connection_status = "Expired"
                db.commit()
                logger.error(f"Failed to refresh Microsoft tokens: {he.detail}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Refresh token failed: {he.detail}"
                )
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error committing refreshed token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Refresh token failed: Failed to save refreshed OAuth tokens."
                )

        decrypted_access_token = decrypt_value(account.access_token)
        if not decrypted_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Graph API Unauthorized: Access token is missing."
            )


        # 3. Call Microsoft Graph calendarView API
        start_dt = datetime.utcnow()
        end_dt = start_dt + timedelta(days=30)
        
        # Format as ISO 8601 UTC strings
        start_str = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_str = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        url = f"https://graph.microsoft.com/v1.0/me/calendarView?startDateTime={start_str}&endDateTime={end_str}"
        logger.info(f"Graph Request URL: {url}")
        
        headers = {
            "Authorization": f"Bearer {decrypted_access_token}",
            "Accept": "application/json"
        }


        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=10.0)
                logger.info(f"Graph Response Status: {response.status_code}")
                
                if response.status_code == 401:
                    logger.error("Graph API Unauthorized: Expired token or invalid credentials.")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Graph API Unauthorized: Microsoft Graph API returned unauthorized status."
                    )
                elif response.status_code == 403:
                    logger.error("Graph API Forbidden: Calendar permission missing.")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Calendar permission missing: Calendars.Read scope is required."
                    )
                elif response.status_code != 200:
                    error_msg = response.text or "Unknown Graph API error"
                    logger.error(f"Graph Error: {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Microsoft Graph Calendar request failed: {error_msg}"
                    )

                events_data = response.json().get("value", [])
                logger.info(f"Retrieved {len(events_data)} calendar events from Microsoft Graph.")

                synced_events = []
                for ev in events_data:
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

                    organizer_email = ev.get("organizer", {}).get("emailAddress", {}).get("address")
                    
                    # Parse online meeting details
                    online_meeting = ev.get("onlineMeeting", {})
                    join_url = online_meeting.get("joinUrl") or ev.get("onlineMeetingUrl")
                    meeting_provider = ev.get("onlineMeetingProvider")
                    is_online_meeting = ev.get("isOnlineMeeting", False) or (join_url is not None)
                    status_str = ev.get("status") or ev.get("showAs") or "unknown"

                    # Check if event already exists (queried using exact user_id and provider)
                    event_record = db.query(CalendarEvent).filter(
                        CalendarEvent.user_id == user_id,
                        CalendarEvent.provider == Provider.MICROSOFT,
                        CalendarEvent.provider_event_id == provider_event_id
                    ).first()

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
                            status=status_str
                        )
                        db.add(event_record)

                    synced_events.append(event_record)

                db.commit()
                
                # Refresh records to get primary keys & populated fields
                for e in synced_events:
                    db.refresh(e)
                
                logger.info(f"Successfully synced and committed {len(synced_events)} events for user {user_id}.")
                return synced_events

            except httpx.RequestError as exc:
                logger.error(f"Network error during Microsoft Graph calendar request: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft Graph API servers."
                )
            except HTTPException as he:
                raise he
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error synchronizing calendar events: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"An unexpected error occurred during calendar synchronization: {str(e)}"
                )
