import logging
import secrets
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.models import ConnectedAccount, Provider
from app.utils.encryption import encrypt_value, decrypt_value

logger = logging.getLogger(__name__)


class GoogleOAuthService:
    """
    Handles Google OAuth 2.0 Authorization Code Flow.
    Supports login URL generation, token exchange, user info fetching, and token refresh.
    """

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

        # Base authorization and token endpoints
        self.auth_base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"

        # Required scopes as requested
        self.scopes = [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly"
        ]

    def generate_state(self) -> str:
        """Generates a secure random state parameter."""
        return secrets.token_urlsafe(32)

    def get_authorization_url(self, state: str) -> str:
        """
        Generates the Google OAuth authorization URL.
        """
        if not self.client_id or not self.redirect_uri:
            logger.error("Google Client ID or Redirect URI is missing from configuration.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth configuration is incomplete."
            )

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true"
        }
        query_string = urllib.parse.urlencode(params)
        auth_url = f"{self.auth_base_url}?{query_string}"
        logger.info(f"Generated Google Authorization URL with state: {state}")
        return auth_url

    async def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """
        Exchanges the authorization code for Google API tokens.
        """
        if not self.client_id or not self.client_secret or not self.redirect_uri:
            logger.error("Google Client ID, Secret, or Redirect URI is missing from configuration.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth configuration is incomplete."
            )

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code"
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("Exchanging auth code for tokens at Google token endpoint.")
                response = await client.post(self.token_url, data=data, headers=headers, timeout=10.0)

                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get("error_description") or error_data.get("error") or "Unknown token exchange error"
                    logger.error(f"Failed Google token exchange response: {response.status_code} - {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Google token exchange failed: {error_msg}"
                    )

                logger.info("Successfully retrieved OAuth tokens from Google.")
                return response.json()

            except httpx.RequestError as exc:
                logger.error(f"Network error communicating with Google: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google authorization servers."
                )

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Fetches the user's profile details using the access token.
        """
        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("Fetching Google user profile info.")
                response = await client.get(self.userinfo_url, headers=headers, timeout=10.0)

                if response.status_code != 200:
                    logger.error(f"Failed to fetch Google user info: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to retrieve Google user profile details."
                    )

                return response.json()

            except httpx.RequestError as exc:
                logger.error(f"Network error communicating with Google API: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google API servers for user info."
                )

    async def refresh_tokens(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refreshes access tokens using the refresh token.
        """
        if not self.client_id or not self.client_secret:
            logger.error("Google Client ID or Secret is missing from configuration.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth configuration is incomplete."
            )

        # Decrypt refresh token if encrypted
        decrypted_refresh_token = decrypt_value(refresh_token)

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": decrypted_refresh_token,
            "grant_type": "refresh_token"
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("Attempting to refresh Google access token.")
                response = await client.post(self.token_url, data=data, headers=headers, timeout=10.0)

                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get("error_description") or error_data.get("error") or "Token refresh error"
                    logger.error(f"Failed to refresh Google tokens: {response.status_code} - {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Google refresh token failed: {error_msg}"
                    )

                logger.info("Successfully refreshed Google tokens.")
                return response.json()

            except httpx.RequestError as exc:
                logger.error(f"Network error during Google token refresh: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google servers for token refresh."
                )

    def save_or_update_google_account(
        self,
        db: Session,
        user_id: str,
        google_user_id: str,
        display_name: str,
        email: str,
        access_token: str,
        refresh_token: Optional[str],
        token_type: str,
        expires_in: int,
        scope: Optional[str] = None
    ) -> ConnectedAccount:
        """
        Saves a new Google connection or updates the existing one for the user.
        """
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Encrypt the sensitive fields
        encrypted_access_token = encrypt_value(access_token)
        encrypted_refresh_token = encrypt_value(refresh_token) if refresh_token else None

        logger.info(
            f"Google OAuth connection callback: [User ID: {user_id}] [Google User ID: {google_user_id}] "
            f"[Provider: {Provider.GOOGLE}] [Email: {email}] [Token Expiry: {expires_at}]"
        )

        account = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == Provider.GOOGLE
        ).first()

        if account:
            logger.info(f"Database Record Updated: Google ConnectedAccount for user {user_id}")
            account.provider_user_id = google_user_id
            account.display_name = display_name
            account.email = email
            account.access_token = encrypted_access_token
            if encrypted_refresh_token:
                account.refresh_token = encrypted_refresh_token
            account.token_type = token_type
            account.expires_at = expires_at
            account.connection_status = "Connected"
            account.last_sync = datetime.utcnow()
            account.scope = scope
            account.updated_at = datetime.utcnow()
        else:
            logger.info(f"Database Record Created: Google ConnectedAccount for user {user_id}")
            account = ConnectedAccount(
                user_id=user_id,
                provider=Provider.GOOGLE,
                provider_user_id=google_user_id,
                display_name=display_name,
                email=email,
                access_token=encrypted_access_token,
                refresh_token=encrypted_refresh_token,
                token_type=token_type,
                expires_at=expires_at,
                connection_status="Connected",
                last_sync=datetime.utcnow(),
                auto_sync=True,
                recording_import=True,
                calendar_sync=True,
                scope=scope,
                connected_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(account)

        try:
            db.commit()
            db.refresh(account)
            return account
        except Exception as e:
            db.rollback()
            logger.error(f"Error saving/updating Google account in database: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist Google ConnectedAccount details to database."
            )
