"""
Google OAuth Provider

Self-contained implementation of AbstractOAuthProvider.
All OAuth logic lives here — no separate service file needed.
"""

import logging
import urllib.parse
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.integrations.providers.base import AbstractOAuthProvider
from app.models.models import ConnectedAccount, Provider
from app.utils.encryption import encrypt_value, decrypt_value

logger = logging.getLogger(__name__)


class GoogleOAuthProvider(AbstractOAuthProvider):
    """
    Google OAuth 2.0 provider (Authorization Code Flow).

    Implements the full flow: authorization URL → code exchange →
    user profile → ConnectedAccount persistence → token refresh.
    """

    def __init__(self) -> None:
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

        self.auth_base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"

        self.scopes = [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
        ]

    # ------------------------------------------------------------------
    # Authorization URL
    # ------------------------------------------------------------------

    def get_authorization_url(self, state: str) -> str:
        if not self.client_id or not self.redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth configuration is incomplete.",
            )
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }
        url = f"{self.auth_base_url}?{urllib.parse.urlencode(params)}"
        logger.info(f"[Google] Authorization URL generated | state={state}")
        return url

    # ------------------------------------------------------------------
    # Token Exchange
    # ------------------------------------------------------------------

    async def exchange_code(self, code: str) -> Dict[str, Any]:
        if not self.client_id or not self.client_secret or not self.redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth configuration is incomplete.",
            )

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("[Google] Exchanging authorization code for tokens.")
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    err = response.json()
                    msg = (
                        err.get("error_description")
                        or err.get("error")
                        or "Token exchange error"
                    )
                    logger.error(
                        f"[Google] Token exchange failed: {response.status_code} {msg}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Google token exchange failed: {msg}",
                    )

                tokens = response.json()
                logger.info("[Google] Token exchange successful.")
                return {
                    "access_token": tokens.get("access_token"),
                    "refresh_token": tokens.get("refresh_token"),
                    "expires_in": tokens.get("expires_in", 3600),
                    "token_type": tokens.get("token_type", "Bearer"),
                    "scope": tokens.get("scope"),
                }

            except httpx.RequestError as exc:
                logger.error(f"[Google] Network error during token exchange: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google authorization servers.",
                )

    # ------------------------------------------------------------------
    # User Profile
    # ------------------------------------------------------------------

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                logger.info("[Google] Fetching user profile.")
                response = await client.get(
                    self.userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"[Google] Profile fetch failed: {response.status_code} {response.text}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to retrieve Google user profile details.",
                    )

                data = response.json()
                name = data.get("name") or data.get("given_name", "")
                return {
                    "provider_user_id": data.get("id"),
                    "display_name": name,
                    "email": data.get("email"),
                }

            except httpx.RequestError as exc:
                logger.error(f"[Google] Network error fetching user profile: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google API servers for user info.",
                )

    # ------------------------------------------------------------------
    # Token Refresh
    # ------------------------------------------------------------------

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh an access token. Accepts the raw (encrypted) refresh_token
        as stored in the database and decrypts it internally.
        """
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth configuration is incomplete.",
            )

        decrypted = decrypt_value(refresh_token)
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": decrypted,
            "grant_type": "refresh_token",
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("[Google] Refreshing access token.")
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    err = response.json()
                    msg = (
                        err.get("error_description")
                        or err.get("error")
                        or "Token refresh error"
                    )
                    logger.error(
                        f"[Google] Token refresh failed: {response.status_code} {msg}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Google refresh token failed: {msg}",
                    )

                tokens = response.json()
                logger.info("[Google] Token refresh successful.")
                return tokens

            except httpx.RequestError as exc:
                logger.error(f"[Google] Network error during token refresh: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Google servers for token refresh.",
                )

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

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
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        enc_access = encrypt_value(access_token)
        enc_refresh = encrypt_value(refresh_token) if refresh_token else None

        logger.info(
            f"[Google] Saving ConnectedAccount | user_id={user_id} "
            f"provider_user_id={provider_user_id} email={email} expires_at={expires_at}"
        )

        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == Provider.GOOGLE,
            )
            .first()
        )

        if account:
            account.provider_user_id = provider_user_id
            account.display_name = display_name
            account.email = email
            account.access_token = enc_access
            if enc_refresh:
                account.refresh_token = enc_refresh
            account.token_type = token_type
            account.expires_at = expires_at
            account.connection_status = "Connected"
            account.last_sync = datetime.utcnow()
            account.scope = scope
            account.updated_at = datetime.utcnow()
        else:
            account = ConnectedAccount(
                user_id=user_id,
                provider=Provider.GOOGLE,
                provider_user_id=provider_user_id,
                display_name=display_name,
                email=email,
                access_token=enc_access,
                refresh_token=enc_refresh,
                token_type=token_type,
                expires_at=expires_at,
                connection_status="Connected",
                last_sync=datetime.utcnow(),
                auto_sync=True,
                recording_import=True,
                calendar_sync=True,
                scope=scope,
                connected_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(account)

        try:
            db.commit()
            db.refresh(account)
            return account
        except Exception as exc:
            db.rollback()
            logger.error(f"[Google] Failed to persist ConnectedAccount: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist Google ConnectedAccount to database.",
            )
