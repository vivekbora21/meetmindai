from datetime import datetime
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.helpers.auth import get_current_user
from app.models.models import User, CalendarEvent, ConnectedAccount, Provider
from app.services.microsoft_calendar import MicrosoftCalendarService
from app.services.google_calendar import GoogleCalendarService
from app.services.zoom_calendar import ZoomCalendarService
from app.schemas.calendar import CalendarEventOut

logger = logging.getLogger(__name__)

router = APIRouter()
calendar_service = MicrosoftCalendarService()


@router.get("/api/calendar/events", response_model=List[CalendarEventOut])
async def get_calendar_events(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Synchronizes upcoming calendar events for all connected providers and returns
    only CalendarEvent DB rows whose provider matches a currently-connected account.
    This ensures events from disconnected platforms are never shown.
    """
    accounts = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.id,
            ConnectedAccount.connection_status == "Connected",
        )
        .all()
    )

    # Build a set of connected base provider names (e.g. {"microsoft", "zoom"})
    connected_providers = set()
    for account in accounts:
        # Normalise to the base provider string stored in CalendarEvent.provider
        provider_val = (
            account.provider.value
            if hasattr(account.provider, "value")
            else str(account.provider)
        )
        connected_providers.add(provider_val.lower())

    # Trigger live sync only for connected providers
    for account in accounts:
        try:
            if account.provider == Provider.MICROSOFT:
                await calendar_service.sync_calendar_events(db, current_user.id)
            elif account.provider == Provider.GOOGLE or account.provider == "google":
                google_service = GoogleCalendarService()
                await google_service.sync_calendar_events(db, current_user.id)
            elif account.provider == Provider.ZOOM or account.provider == "zoom":
                zoom_service = ZoomCalendarService()
                await zoom_service.sync_calendar_events(db, current_user.id)
        except Exception as e:
            logger.error(f"Failed to sync calendar events for {account.provider}: {e}")

    if not connected_providers:
        # No connected accounts — return nothing
        return []

    # Return only CalendarEvent rows for currently-connected providers
    events = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.user_id == current_user.id,
            CalendarEvent.provider.in_(list(connected_providers)),
        )
        .order_by(CalendarEvent.start_time)
        .all()
    )
    return events
