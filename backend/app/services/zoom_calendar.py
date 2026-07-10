import logging
from datetime import datetime, timedelta, timezone
from typing import List
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import ConnectedAccount, Meeting, Provider
from app.integrations.registry import get_provider
from app.utils.encryption import decrypt_value, encrypt_value

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Scope constants
# ---------------------------------------------------------------------------
# Zoom uses GRANULAR scopes like "meeting:read:list_meetings" (NOT "meeting:read").
# Validation uses prefix matching: required "user:read" is satisfied by
# any granted scope that equals "user:read" OR starts with "user:read:".
#
# API call -> required scope:
#   GET /users/me/meetings  ->  meeting:read:list_meetings
#   GET /users/me           ->  user:read:user  (any user:read:* satisfies this)
REQUIRED_SCOPE_PREFIXES: list[str] = [
    "meeting:read:list_meetings",
    "user:read",
]

# Zoom error codes that mean a PERMANENT scope/permission failure.
# Must NOT be retried - user must reconnect.
PERMISSION_ERROR_CODES = {4711, 4700, 4701, 4704, 4710}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def parse_zoom_datetime(dt_str: str) -> datetime:
    """Parses Zoom API ISO datetime strings to UTC-naive datetime."""
    if not dt_str:
        return datetime.utcnow()
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return datetime.utcnow()


def check_granted_scopes(granted_scope_str: str | None) -> list[str]:
    """
    Returns a list of REQUIRED_SCOPE_PREFIXES that are NOT satisfied by the
    granted token.  An empty list means all required permissions are present.

    Zoom issues granular scopes like 'meeting:read:list_meetings' or
    'user:read:email'.  A required prefix like 'user:read' is satisfied if
    ANY granted scope equals it OR starts with it followed by ':'.
    """
    if not granted_scope_str:
        # No scope recorded yet - don't block, let the API call decide.
        return []
    granted = [s.strip() for s in granted_scope_str.split() if s.strip()]
    missing = []
    for required in REQUIRED_SCOPE_PREFIXES:
        satisfied = any(g == required or g.startswith(required + ":") for g in granted)
        if not satisfied:
            missing.append(required)
    return missing


def is_permission_error(zoom_code: int | None) -> bool:
    return zoom_code in PERMISSION_ERROR_CODES


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class ZoomCalendarService:
    """
    Fetches meetings from GET /users/me/meetings and syncs them into the
    local Meeting table.

    Error classification:
      - permission errors  -> mark account needs_reauthorization, stop immediately
      - transient errors   -> raise HTTPException (scheduler retries next cycle)
    """

    def __init__(self):
        self._provider = get_provider("zoom")

    # -- Public entry point --------------------------------------------------

    async def sync_calendar_events(self, db: Session, user_id: str) -> List[Meeting]:
        """
        Main sync entry point called by the scheduler and /api/calendar/events.
        """
        logger.info(
            f"[Zoom Sync] Requested | user_id={user_id} provider={Provider.ZOOM}"
        )

        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == Provider.ZOOM,
            )
            .first()
        )

        if not account:
            logger.warning(f"[Zoom Sync] No ConnectedAccount for user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Zoom account not connected. Please connect your Zoom account first.",
            )

        # Guard: already flagged as needing reconnect
        if account.connection_status == "needs_reauthorization":
            logger.warning(
                f"[Zoom Sync] Skipped - needs_reauthorization | user_id={user_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Your Zoom token is missing required meeting permissions. "
                    "Please reconnect your Zoom account from Settings > Integrations."
                ),
            )

        # 1. Validate stored scopes using prefix matching (Zoom granular scopes)
        missing_scopes = check_granted_scopes(account.scope)
        if missing_scopes:
            logger.warning(
                f"[Zoom Sync] Scope mismatch | user_id={user_id} "
                f"granted='{account.scope}' missing={missing_scopes}"
            )
            self._mark_needs_reauth(
                db,
                account,
                f"Token missing required scopes: {missing_scopes}. "
                "Please reconnect your Zoom account.",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Zoom token is missing required scopes: {missing_scopes}. "
                    "Please reconnect from Settings > Integrations."
                ),
            )

        # 2. Refresh token if near expiry
        await self._refresh_token_if_needed(db, account, user_id)

        decrypted_token = decrypt_value(account.access_token)
        if not decrypted_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Zoom access token missing. Please reconnect your Zoom account.",
            )

        # 3. Call Zoom API and sync
        return await self._fetch_and_sync(db, account, user_id, decrypted_token)

    # -- Private helpers -----------------------------------------------------

    async def _refresh_token_if_needed(
        self, db: Session, account: ConnectedAccount, user_id: str
    ) -> None:
        """Refreshes the stored access token if expired or expiring within 60s."""
        if account.expires_at and account.expires_at > datetime.utcnow() + timedelta(
            seconds=60
        ):
            return  # Still valid

        logger.info(f"[Zoom Sync] Token near expiry - refreshing | user_id={user_id}")

        if not account.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Zoom refresh token missing. Please reconnect your Zoom account.",
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
            # Persist newly granted scopes if returned
            if new_tokens.get("scope"):
                account.scope = new_tokens["scope"]
            account.connection_status = "Connected"
            db.commit()
            logger.info(f"[Zoom Sync] Token refreshed | user_id={user_id}")
        except HTTPException as he:
            account.connection_status = "Expired"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Zoom token refresh failed: {he.detail}",
            )
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save refreshed Zoom tokens.",
            )

    async def _fetch_and_sync(
        self,
        db: Session,
        account: ConnectedAccount,
        user_id: str,
        access_token: str,
    ) -> List[Meeting]:
        """
        Calls GET /users/me/meetings and syncs results.
        Raises immediately on permission errors; re-raises transients for retry.
        """
        url = "https://api.zoom.us/v2/users/me/meetings"
        params = {"type": "upcoming", "page_size": "100"}
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url, params=params, headers=headers, timeout=10.0
                )

                logger.info(
                    f"[Zoom Sync] API response | user_id={user_id} "
                    f"endpoint={url} http_status={response.status_code} "
                    f"account_email={account.email}"
                )

                if response.status_code == 200:
                    meetings_data = response.json().get("meetings", [])
                    logger.info(
                        f"[Zoom Sync] Got {len(meetings_data)} meetings | user_id={user_id}"
                    )
                    return self._upsert_meetings(db, account, meetings_data, user_id)

                # Parse Zoom error payload
                try:
                    err_json = response.json()
                    zoom_code = err_json.get("code")
                    zoom_message = err_json.get("message", "Unknown Zoom API error")
                except Exception:
                    zoom_code = None
                    zoom_message = response.text or "Unknown Zoom API error"

                logger.error(
                    f"[Zoom Sync] API error | http_status={response.status_code} "
                    f"zoom_code={zoom_code} message={zoom_message} "
                    f"user_id={user_id} granted_scopes='{account.scope}'"
                )

                # Permanent permission error -> mark needs reconnect
                if is_permission_error(zoom_code) or response.status_code in (401, 403):
                    self._mark_needs_reauth(
                        db,
                        account,
                        f"Zoom API error {zoom_code}: {zoom_message} | "
                        "Token missing required permissions. Please reconnect.",
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            f"Zoom sync failed (error {zoom_code}): {zoom_message}. "
                            "Your token is missing required permissions. "
                            "Please reconnect from Settings > Integrations."
                        ),
                    )

                # Transient error -> retryable
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Zoom API returned HTTP {response.status_code}: {zoom_message}.",
                )

            except httpx.RequestError as exc:
                logger.error(
                    f"[Zoom Sync] Network error | user_id={user_id} error={exc}"
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to reach Zoom API servers. Will retry automatically.",
                )
            except HTTPException:
                raise
            except Exception as e:
                db.rollback()
                logger.error(
                    f"[Zoom Sync] Unexpected error | user_id={user_id} error={e}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Zoom meeting synchronization failed: {e}",
                )

    def _upsert_meetings(
        self,
        db: Session,
        account: ConnectedAccount,
        meetings_data: list,
        user_id: str,
    ) -> List[Meeting]:
        """Inserts or updates Meeting rows from the Zoom API payload."""
        synced_meetings: List[Meeting] = []
        synced_event_ids: set[str] = set()

        for mt in meetings_data:
            provider_event_id = str(mt.get("id", "")).strip()
            if not provider_event_id:
                continue

            start_str_raw = mt.get("start_time")
            if not start_str_raw:
                continue

            title = mt.get("topic") or "Zoom Meeting"
            description = mt.get("agenda") or ""
            join_url = mt.get("join_url")
            start_time = parse_zoom_datetime(start_str_raw)

            meeting_record = (
                db.query(Meeting)
                .filter(
                    Meeting.organization_id == account.user.organization_id,
                    Meeting.provider == "zoom",
                    Meeting.provider_event_id == provider_event_id,
                )
                .first()
            )

            if meeting_record:
                meeting_record.title = title
                meeting_record.description = description
                meeting_record.meeting_date = start_time
                meeting_record.meeting_url = join_url
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
                    platform="Zoom",
                    meeting_date=start_time,
                    status="UPLOADED",
                    provider="zoom",
                    provider_event_id=provider_event_id,
                    calendar_id="zoom",
                    organizer_email=account.email,
                    attendees=[],
                    sync_status="synced",
                    last_synced_at=datetime.utcnow(),
                    join_status="Scheduled",
                )
                db.add(meeting_record)

            synced_event_ids.add(provider_event_id)
            synced_meetings.append(meeting_record)

        # Mark meetings deleted from Zoom as cancelled
        start_dt = datetime.utcnow()
        end_dt = start_dt + timedelta(days=30)
        existing = (
            db.query(Meeting)
            .filter(
                Meeting.organization_id == account.user.organization_id,
                Meeting.provider == "zoom",
                Meeting.meeting_date >= start_dt,
                Meeting.meeting_date <= end_dt,
            )
            .all()
        )
        for m in existing:
            if m.provider_event_id not in synced_event_ids:
                m.sync_status = "cancelled"
                m.join_status = "Cancelled"
                m.status = "FAILED"

        db.commit()
        for m in synced_meetings:
            db.refresh(m)

        logger.info(
            f"[Zoom Sync] Committed {len(synced_meetings)} meetings | user_id={user_id}"
        )
        return synced_meetings

    def _mark_needs_reauth(
        self, db: Session, account: ConnectedAccount, reason: str
    ) -> None:
        """Marks account as needing reauth so scheduler stops retrying."""
        try:
            account.connection_status = "needs_reauthorization"
            account.sync_errors = reason
            db.commit()
            logger.warning(
                f"[Zoom Sync] Marked needs_reauthorization | "
                f"account_id={account.id} email={account.email}"
            )
        except Exception as e:
            db.rollback()
            logger.error(f"[Zoom Sync] Failed to mark needs_reauthorization: {e}")
