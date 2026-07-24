import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, text

from app.database.connection import SessionLocal

from app.models.models import (
    ConnectedAccount,
    Meeting,
    Provider,
    ScheduledMeeting,
    AgentLiveSession,
)
from app.services.google_calendar import GoogleCalendarService
from app.services.microsoft_calendar import MicrosoftCalendarService
from app.services.zoom_calendar import ZoomCalendarService
from app.integrations.registry import get_provider

logger = logging.getLogger(__name__)


def _is_permission_error(exc: Exception) -> bool:
    """
    Returns True if the exception signals a permanent permission / scope failure
    that cannot be resolved by retrying.  These include:
      - HTTP 403 Forbidden (missing scopes, invalid token for endpoint)
      - HTTP 401 Unauthorized that has already been retried via refresh
    Transient errors (502, 500, network timeouts) return False and will be retried.
    """
    from fastapi import HTTPException as _HTTPException

    if isinstance(exc, _HTTPException):
        return exc.status_code in (401, 403)
    msg = str(exc).lower()
    return (
        "missing required scopes" in msg
        or "needs_reauthorization" in msg
        or "does not contain scopes" in msg
        or "403" in msg
    )


class BackgroundSchedulerService:
    """
    Background scheduler service running jobs every minute:
    - Expired token refresh
    - Calendar synchronization
    - Preparing upcoming meetings for join readiness
    - Cleaning up duplicate meetings
    - Retrying failed synchronizations
    """

    def __init__(self, db: Session):
        self.db = db
        self.google_calendar = GoogleCalendarService()
        self.microsoft_calendar = MicrosoftCalendarService()
        self.zoom_calendar = ZoomCalendarService()

    async def run_jobs(self):
        """Executes all background tasks with retry logic and detailed logging."""
        start_time = time.time()
        logger.debug("Scheduler execution cycle started.")

        summary = {
            "accounts_checked": 0,
            "tokens_refreshed": 0,
            "calendars_synced": 0,
            "meetings_imported": 0,
            "errors": 0,
        }

        # 1. Expired token refresh
        try:
            refreshed, checked = await self.refresh_expired_tokens()
            summary["tokens_refreshed"] += refreshed
            summary["accounts_checked"] += checked
        except Exception as e:
            summary["errors"] += 1
            logger.error(f"Scheduler | Error refreshing expired tokens: {e}")

        # 2. Calendar synchronization
        try:
            synced, imported, checked = await self.sync_calendars()
            summary["calendars_synced"] += synced
            summary["meetings_imported"] += imported
            summary["accounts_checked"] += checked
        except Exception as e:
            summary["errors"] += 1
            logger.error(f"Scheduler | Error syncing calendars: {e}")

        # 3. Prepare upcoming meetings for bot joining (starts in 2 to 5 minutes)
        try:
            await self.prepare_upcoming_meetings()
        except Exception as e:
            summary["errors"] += 1
            logger.error(f"Scheduler | Error preparing upcoming meetings: {e}")

        # 4. Cleanup duplicate meetings (only if we imported meetings)
        if summary["meetings_imported"] > 0:
            try:
                await self.cleanup_duplicate_meetings()
            except Exception as e:
                summary["errors"] += 1
                logger.error(f"Scheduler | Error cleaning up duplicate meetings: {e}")

        # 5. Retry failed synchronizations
        try:
            synced, imported, checked = await self.retry_failed_syncs()
            summary["calendars_synced"] += synced
            summary["meetings_imported"] += imported
            summary["accounts_checked"] += checked
        except Exception as e:
            summary["errors"] += 1
            logger.error(f"Scheduler | Error retrying failed syncs: {e}")

        # 6. Safety net for scheduled bot joins
        try:
            await self.queue_due_scheduled_meetings()
        except Exception as e:
            summary["errors"] += 1
            logger.error(f"Scheduler | Error queueing due scheduled meetings: {e}")

        duration = time.time() - start_time
        logger.debug("Scheduler execution cycle completed.")

        # Structured logger summary
        has_activity = (
            summary["accounts_checked"] > 0
            or summary["tokens_refreshed"] > 0
            or summary["calendars_synced"] > 0
            or summary["meetings_imported"] > 0
            or summary["errors"] > 0
        )

        summary_msg = (
            f"Scheduler Summary\n"
            f"  Accounts Checked : {summary['accounts_checked']}\n"
            f"  Tokens Refreshed : {summary['tokens_refreshed']}\n"
            f"  Calendars Synced : {summary['calendars_synced']}\n"
            f"  Meetings Imported: {summary['meetings_imported']}\n"
            f"  Errors           : {summary['errors']}\n"
            f"  Duration         : {duration:.2f} sec"
        )

        if has_activity:
            logger.info(summary_msg)
        else:
            logger.debug(summary_msg)

    async def refresh_expired_tokens(self) -> Tuple[int, int]:
        """Refreshes tokens that are expired or expiring in the next 5 minutes."""
        expiry_threshold = datetime.utcnow() + timedelta(minutes=5)
        expiring_accounts = (
            self.db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.connection_status == "Connected",
                ConnectedAccount.expires_at <= expiry_threshold,
            )
            .all()
        )

        checked_count = len(expiring_accounts)
        refreshed_count = 0

        logger.debug(
            f"Scheduler | Found {checked_count} accounts needing token refresh."
        )
        for acc in expiring_accounts:
            try:
                logger.debug(
                    f"Scheduler | Refreshing tokens for {acc.provider} account: {acc.email}"
                )
                provider_name = (
                    acc.provider.value
                    if hasattr(acc.provider, "value")
                    else str(acc.provider)
                )
                oauth_provider = get_provider(provider_name)
                new_tokens = await oauth_provider.refresh_access_token(
                    acc.refresh_token
                )
                from app.utils.encryption import encrypt_value

                acc.access_token = encrypt_value(new_tokens["access_token"])
                if new_tokens.get("refresh_token"):
                    acc.refresh_token = encrypt_value(new_tokens["refresh_token"])
                acc.expires_at = datetime.utcnow() + timedelta(
                    seconds=new_tokens.get("expires_in", 3600)
                )
                acc.connection_status = "Connected"
                self.db.commit()
                refreshed_count += 1
            except Exception as e:
                self.db.rollback()
                logger.error(
                    f"Scheduler | Failed to refresh token for connected account {acc.id}: {e}"
                )
                acc.connection_status = "Expired"
                acc.sync_errors = f"Token refresh failed: {str(e)}"
                self.db.commit()
        return refreshed_count, checked_count

    async def sync_calendars(self) -> Tuple[int, int, int]:
        """Synchronizes calendars for connected accounts configured with auto_sync."""
        sync_threshold = datetime.utcnow() - timedelta(minutes=15)
        accounts = (
            self.db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.connection_status == "Connected",
                ConnectedAccount.auto_sync == True,
                or_(
                    ConnectedAccount.last_sync.is_(None),
                    ConnectedAccount.last_sync <= sync_threshold,
                ),
            )
            .all()
        )

        checked_count = len(accounts)
        synced_count = 0
        meetings_imported = 0

        logger.debug(f"Scheduler | Syncing calendars for {checked_count} accounts.")
        for acc in accounts:
            try:
                logger.debug(
                    f"Scheduler | Triggering auto calendar sync for {acc.provider} - {acc.email}"
                )
                imported_list = []
                if acc.provider == Provider.GOOGLE:
                    imported_list = await self.google_calendar.sync_calendar_events(
                        self.db, acc.user_id
                    )
                elif acc.provider == Provider.MICROSOFT:
                    imported_list = await self.microsoft_calendar.sync_calendar_events(
                        self.db, acc.user_id
                    )
                elif acc.provider == Provider.ZOOM or acc.provider == "zoom":
                    imported_list = await self.zoom_calendar.sync_calendar_events(
                        self.db, acc.user_id
                    )

                if imported_list:
                    meetings_imported += len(imported_list)

                acc.last_sync = datetime.utcnow()
                self.db.commit()
                synced_count += 1
            except Exception as e:
                error_str = str(e)
                # 403 / needs_reauthorization = permanent permission error.
                # Mark the account so the user sees a reconnect prompt and
                # this account is not retried in retry_failed_syncs.
                if _is_permission_error(e):
                    logger.warning(
                        f"Scheduler | Permanent permission error for {acc.provider} "
                        f"account {acc.id} – marking needs_reauthorization."
                    )
                    try:
                        acc.connection_status = "needs_reauthorization"
                        acc.sync_errors = (
                            f"Sync blocked: token missing required permissions. "
                            f"Please reconnect your {acc.provider} account. "
                            f"Detail: {error_str[:300]}"
                        )
                        self.db.commit()
                    except Exception:
                        self.db.rollback()
                else:
                    # Transient error – record it so retry_failed_syncs picks it up.
                    logger.error(
                        f"Scheduler | Calendar sync failed for {acc.provider} "
                        f"account {acc.id}: {error_str}"
                    )
                    try:
                        acc.sync_errors = f"Sync failed: {error_str[:300]}"
                        self.db.commit()
                    except Exception:
                        self.db.rollback()
        return synced_count, meetings_imported, checked_count

    async def prepare_upcoming_meetings(self):
        """
        Finds upcoming meetings starting within the next configurable time window (2-5 minutes).
        Updates status/join_status to 'Ready to Join' to prepare the platform for future bot joining.
        """
        now = datetime.utcnow()
        window_start = now + timedelta(minutes=2)
        window_end = now + timedelta(minutes=5)

        upcoming_meetings = (
            self.db.query(Meeting)
            .filter(
                Meeting.meeting_date >= window_start,
                Meeting.meeting_date <= window_end,
                Meeting.provider.isnot(None),
                Meeting.join_status == "Scheduled",
            )
            .all()
        )

        logger.debug(
            f"Scheduler | Preparing {len(upcoming_meetings)} upcoming meetings for bot joining."
        )
        for m in upcoming_meetings:
            try:
                logger.debug(
                    f"Scheduler | Setting meeting '{m.title}' to 'Ready to Join' status."
                )
                m.join_status = "Ready to Join"
                # Keep status in sync as well
                m.status = "PROCESSING"  # Set to PROCESSING so frontend knows it's actively ingestion-ready
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                logger.error(
                    f"Scheduler | Failed to prepare meeting {m.id} for joining: {e}"
                )

    async def cleanup_duplicate_meetings(self):
        """Cleans up duplicate meetings in the database (same provider + provider_event_id)."""
        duplicates = self.db.execute(text("""
                SELECT provider, provider_event_id, organization_id, COUNT(*)
                FROM meetings
                WHERE provider IS NOT NULL AND provider_event_id IS NOT NULL
                GROUP BY provider, provider_event_id, organization_id
                HAVING COUNT(*) > 1
                """)).fetchall()

        if duplicates:
            logger.debug(
                f"Scheduler | Found {len(duplicates)} duplicate group records. Cleaning up..."
            )
            for dup in duplicates:
                prov, ev_id, org_id, _ = dup
                # Fetch all meetings matching these fields, ordered by last_synced_at desc
                meetings = (
                    self.db.query(Meeting)
                    .filter(
                        Meeting.provider == prov,
                        Meeting.provider_event_id == ev_id,
                        Meeting.organization_id == org_id,
                    )
                    .order_by(Meeting.last_synced_at.desc())
                    .all()
                )

                # Keep the first, delete the rest
                primary = meetings[0]
                for m in meetings[1:]:
                    logger.debug(
                        f"Scheduler | Deleting duplicate meeting record ID: {m.id}"
                    )
                    self.db.delete(m)
            self.db.commit()

    async def retry_failed_syncs(self) -> Tuple[int, int, int]:
        """Retries calendar synchronization for accounts with transient sync errors.
        Accounts in 'needs_reauthorization' status are deliberately excluded.
        """
        failed_accounts = (
            self.db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.connection_status == "Connected",
                ConnectedAccount.sync_errors.isnot(None),
            )
            .all()
        )

        checked_count = len(failed_accounts)
        synced_count = 0
        meetings_imported = 0

        logger.debug(
            f"Scheduler | Retrying {checked_count} accounts with transient sync errors."
        )
        for acc in failed_accounts:
            try:
                logger.debug(
                    f"Scheduler | Retrying calendar sync for {acc.provider} - {acc.email}"
                )
                imported_list = []
                if acc.provider == Provider.GOOGLE:
                    imported_list = await self.google_calendar.sync_calendar_events(
                        self.db, acc.user_id
                    )
                elif acc.provider == Provider.MICROSOFT:
                    imported_list = await self.microsoft_calendar.sync_calendar_events(
                        self.db, acc.user_id
                    )
                elif acc.provider == Provider.ZOOM or acc.provider == "zoom":
                    imported_list = await self.zoom_calendar.sync_calendar_events(
                        self.db, acc.user_id
                    )

                if imported_list:
                    meetings_imported += len(imported_list)

                acc.sync_errors = None
                acc.last_sync = datetime.utcnow()
                self.db.commit()
                synced_count += 1
            except Exception as e:
                if _is_permission_error(e):
                    # Escalate to permanent – stop retrying.
                    logger.warning(
                        f"Scheduler | Retry revealed permanent permission error for "
                        f"{acc.provider} account {acc.id} – marking needs_reauthorization."
                    )
                    try:
                        acc.connection_status = "needs_reauthorization"
                        acc.sync_errors = (
                            f"Sync blocked: token missing required permissions. "
                            f"Please reconnect your {acc.provider} account."
                        )
                        self.db.commit()
                    except Exception:
                        self.db.rollback()
                else:
                    logger.warning(
                        f"Scheduler | Retry still failing for {acc.provider} "
                        f"account {acc.id}: {e}"
                    )
        return synced_count, meetings_imported, checked_count

    async def queue_due_scheduled_meetings(self) -> int:
        """
        Enqueue scheduled meetings whose start time has arrived.
        This prevents the automation from depending on a single ETA dispatch.
        """
        now = datetime.utcnow()
        due_meetings = (
            self.db.query(ScheduledMeeting)
            .filter(
                ScheduledMeeting.status == "Scheduled",
                ScheduledMeeting.scheduled_start <= now,
            )
            .all()
        )

        queued = 0
        logger.debug(
            f"Scheduler | Found {len(due_meetings)} scheduled meetings ready to join."
        )
        for scheduled in due_meetings:
            try:
                session = (
                    self.db.query(AgentLiveSession)
                    .filter(AgentLiveSession.scheduled_meeting_id == scheduled.id)
                    .first()
                )
                if session and session.status in ("Live", "Completed"):
                    continue

                from app.tasks.meeting_tasks import join_scheduled_meeting

                join_scheduled_meeting.apply_async(args=[scheduled.id])
                queued += 1
                logger.info(
                    f"Scheduler | Queued auto-join for scheduled meeting {scheduled.id}"
                )
            except Exception as e:
                logger.error(
                    f"Scheduler | Failed to queue scheduled meeting {scheduled.id}: {e}"
                )

        return queued


async def start_scheduler():
    """Main scheduler background task loop."""
    logger.info("Starting background scheduler loop...")
    while True:
        try:
            db = SessionLocal()
            scheduler = BackgroundSchedulerService(db)
            await scheduler.run_jobs()
            db.close()
        except Exception as e:
            logger.error(f"Scheduler | Critical exception in background loop: {e}")
        await asyncio.sleep(60)
