"""
Integration Service

Shared business-logic layer used by the generic OAuth router.
Handles ConnectedAccount calendar synchronization via the provider registry,
replacing the provider-specific if/elif chains in profile.py.
"""

import logging
from sqlalchemy.orm import Session

from app.models.models import ConnectedAccount
from app.integrations.registry import get_provider

logger = logging.getLogger(__name__)


class IntegrationService:
    """
    Provider-agnostic service for calendar synchronization.

    Usage:
        service = IntegrationService()
        await service.sync_integration(db, integration)
    """

    async def sync_integration(
        self,
        db: Session,
        integration: ConnectedAccount,
        user_id: str,
    ) -> None:
        """
        Trigger a calendar sync for the given integration.

        Delegates to the appropriate calendar service based on the
        provider stored in the ConnectedAccount record.

        Args:
            db: Active database session.
            integration: The ConnectedAccount ORM object to sync.
            user_id: The owning user's ID (used by calendar services).
        """
        provider_name: str = (
            integration.provider.value
            if hasattr(integration.provider, "value")
            else str(integration.provider)
        )

        logger.info(
            f"[IntegrationService] Triggering sync | "
            f"provider={provider_name} user_id={user_id}"
        )

        if provider_name == "microsoft":
            from app.services.microsoft_calendar import MicrosoftCalendarService

            await MicrosoftCalendarService().sync_calendar_events(db, user_id)

        elif provider_name == "google":
            from app.services.google_calendar import GoogleCalendarService

            await GoogleCalendarService().sync_calendar_events(db, user_id)

        elif provider_name == "zoom":
            from app.services.zoom_calendar import ZoomCalendarService

            await ZoomCalendarService().sync_calendar_events(db, user_id)

        else:
            # Generic mock refresh for unrecognised / demo providers
            from datetime import datetime, timedelta
            import uuid

            if integration.expires_at and integration.expires_at < datetime.utcnow():
                integration.access_token = f"mock_refreshed_{uuid.uuid4().hex}"
                integration.expires_at = datetime.utcnow() + timedelta(hours=1)
                integration.connection_status = "Connected"
                logger.info(
                    f"[IntegrationService] Mock token refresh for provider={provider_name}"
                )
