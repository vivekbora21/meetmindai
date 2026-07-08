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


class MicrosoftOAuthService:
    """
    Handles Microsoft OAuth 2.0 Authorization Code Flow.
    Supports login URL generation, secure state validation, token exchange, and token refresh.
    """

    def __init__(self):
        self.client_id = settings.MICROSOFT_CLIENT_ID
        self.client_secret = settings.MICROSOFT_CLIENT_SECRET
        self.tenant_id = settings.MICROSOFT_TENANT_ID or "common"
        self.redirect_uri = settings.MICROSOFT_REDIRECT_URI

        # Base authorization and token endpoints
        self.auth_base_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"
        self.token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"

        # Required scopes as requested
        self.scopes = [
            "openid",
            "profile",
            "offline_access",
            "User.Read",
            "Calendars.Read",
            "Calendars.Read.Shared",
            "OnlineMeetings.Read"
        ]

    def generate_state(self) -> str:
        """Generates a secure random state parameter."""
        return secrets.token_urlsafe(32)

    def get_authorization_url(self, state: str) -> str:
        """
        Generates the Microsoft OAuth authorization URL.
        """
        if not self.client_id or not self.redirect_uri:
            logger.error("Microsoft Client ID or Redirect URI is missing from configuration.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Microsoft OAuth configuration is incomplete."
            )

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": " ".join(self.scopes),
            "state": state,
            "prompt": "select_account"
        }
        query_string = urllib.parse.urlencode(params)
        auth_url = f"{self.auth_base_url}?{query_string}"
        logger.info(f"Generated Microsoft Authorization URL with state: {state}")
        return auth_url

    async def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """
        Exchanges the authorization code for Microsoft Graph API tokens.
        """
        if not self.client_id or not self.client_secret or not self.redirect_uri:
            logger.error("Microsoft Client ID, Secret, or Redirect URI is missing from configuration.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Microsoft OAuth configuration is incomplete."
            )

        data = {
            "client_id": self.client_id,
            "scope": " ".join(self.scopes),
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "client_secret": self.client_secret
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("Exchanging auth code for tokens at Microsoft token endpoint.")
                response = await client.post(self.token_url, data=data, headers=headers, timeout=10.0)
                
                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get("error_description") or error_data.get("error") or "Unknown token exchange error"
                    logger.error(f"Failed token exchange response: {response.status_code} - {error_msg}")
                    
                    if "invalid_grant" in error_msg or "expired" in error_msg:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Authorization code expired or invalid: {error_msg}"
                        )
                    
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Microsoft token exchange failed: {error_msg}"
                    )

                logger.info("Successfully retrieved OAuth tokens from Microsoft.")
                return response.json()

            except httpx.RequestError as exc:
                logger.error(f"Network error communicating with Microsoft: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft authorization servers."
                )

    async def refresh_tokens(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refreshes access tokens using the refresh token.
        """
        if not self.client_id or not self.client_secret:
            logger.error("Microsoft Client ID or Secret is missing from configuration.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Microsoft OAuth configuration is incomplete."
            )

        decrypted_refresh_token = decrypt_value(refresh_token)

        data = {
            "client_id": self.client_id,
            "scope": " ".join(self.scopes),
            "refresh_token": decrypted_refresh_token,
            "grant_type": "refresh_token",
            "client_secret": self.client_secret
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("Attempting to refresh Microsoft access token.")
                response = await client.post(self.token_url, data=data, headers=headers, timeout=10.0)

                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get("error_description") or error_data.get("error") or "Token refresh error"
                    logger.error(f"Failed to refresh Microsoft tokens: {response.status_code} - {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Refresh token failed: {error_msg}"
                    )

                logger.info("Successfully refreshed Microsoft tokens.")
                return response.json()

            except httpx.RequestError as exc:
                logger.error(f"Network error during Microsoft token refresh: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft servers for token refresh."
                )

    def save_or_update_microsoft_account(
        self,
        db: Session,
        user_id: str,
        graph_user_id: str,
        display_name: str,
        email: str,
        access_token: str,
        refresh_token: str,
        token_type: str,
        expires_in: int
    ) -> ConnectedAccount:
        """
        Saves a new Microsoft connection or updates the existing one for the user.
        """
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Encrypt the sensitive fields
        encrypted_access_token = encrypt_value(access_token)
        encrypted_refresh_token = encrypt_value(refresh_token) if refresh_token else None

        # Structured OAuth Logging
        logger.info(
            f"Microsoft OAuth connection callback: [User ID: {user_id}] [Graph User ID: {graph_user_id}] "
            f"[Provider: {Provider.MICROSOFT}] [Email: {email}] "
            f"[Access Token Length: {len(access_token) if access_token else 0}] "
            f"[Token Expiry: {expires_at}]"
        )

        # Check if record already exists for this user and provider
        account = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == Provider.MICROSOFT
        ).first()

        if account:
            logger.info(f"Database Record Updated: ConnectedAccount for user {user_id}")
            account.provider_user_id = graph_user_id
            account.display_name = display_name
            account.email = email
            account.access_token = encrypted_access_token
            if encrypted_refresh_token:
                account.refresh_token = encrypted_refresh_token
            account.token_type = token_type
            account.expires_at = expires_at
            account.connection_status = "Connected"
            account.last_sync = datetime.utcnow()
        else:
            logger.info(f"Database Record Created: ConnectedAccount for user {user_id}")
            account = ConnectedAccount(
                user_id=user_id,
                provider=Provider.MICROSOFT,
                provider_user_id=graph_user_id,
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
                calendar_sync=True
            )
            db.add(account)


        try:
            db.commit()
            db.refresh(account)
            return account
        except Exception as e:
            db.rollback()
            logger.error(f"Error saving/updating Microsoft account in database: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist ConnectedAccount details to database."
            )
