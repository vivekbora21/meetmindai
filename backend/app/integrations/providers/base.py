"""
Abstract OAuth Provider Base Class

All meeting/calendar OAuth providers must implement this interface.
Adding a new provider only requires:
  1. Create a new module in providers/
  2. Implement AbstractOAuthProvider
  3. Register in registry.py
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.models.models import ConnectedAccount


class AbstractOAuthProvider(ABC):
    """
    Abstract base class defining the contract for all OAuth integration providers.

    Each concrete provider encapsulates the provider-specific OAuth flow while
    exposing a uniform interface to the generic integration router and service.
    """

    # ------------------------------------------------------------------
    # Authorization URL
    # ------------------------------------------------------------------

    @abstractmethod
    def get_authorization_url(
        self, state: str, redirect_uri: Optional[str] = None
    ) -> str:
        """
        Generate the provider-specific OAuth authorization URL.

        Args:
            state: A signed JWT state parameter for CSRF protection.
            redirect_uri: Optional redirect URI to override the default.

        Returns:
            The full authorization URL to redirect the user to.
        """

    # ------------------------------------------------------------------
    # Token Exchange
    # ------------------------------------------------------------------

    @abstractmethod
    async def exchange_code(
        self, code: str, redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Exchange an authorization code for access/refresh tokens.

        Args:
            code: The authorization code received in the OAuth callback.

        Returns:
            A dictionary containing at minimum:
              - access_token (str)
              - refresh_token (str | None)
              - expires_in (int)  — seconds until expiry
              - token_type (str)
              - scope (str | None)
        """

    # ------------------------------------------------------------------
    # User Profile
    # ------------------------------------------------------------------

    @abstractmethod
    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """
        Fetch the authenticated user's profile from the provider.

        Args:
            access_token: A valid access token.

        Returns:
            A normalized dictionary containing:
              - provider_user_id (str)
              - display_name (str)
              - email (str)
        """

    # ------------------------------------------------------------------
    # Token Refresh
    # ------------------------------------------------------------------

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh an expired access token using the stored refresh token.

        Args:
            refresh_token: The (encrypted) refresh token from the database.

        Returns:
            The same structure as exchange_code().
        """

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    @abstractmethod
    def save_or_update_account(
        self,
        db: Session,
        user_id: str,
        provider_user_id: str,
        display_name: str,
        email: str,
        access_token: str,
        refresh_token: Optional[str],
        token_type: str,
        expires_in: int,
        scope: Optional[str] = None,
    ) -> ConnectedAccount:
        """
        Upsert the ConnectedAccount record for this provider/user combination.

        Args:
            db: SQLAlchemy database session.
            user_id: Internal application user ID.
            provider_user_id: The provider's unique identifier for the user.
            display_name: Human-readable name returned by the provider.
            email: Provider-verified email address.
            access_token: Raw (unencrypted) access token.
            refresh_token: Raw (unencrypted) refresh token, if provided.
            token_type: Token type (usually "Bearer").
            expires_in: Token lifetime in seconds.
            scope: Space-separated granted scopes, if returned.

        Returns:
            The saved or updated ConnectedAccount ORM instance.
        """
