"""
Microsoft OAuth Provider

Self-contained implementation of AbstractOAuthProvider.
All OAuth logic (URL generation, token exchange, token refresh, profile fetch,
ConnectedAccount persistence) lives here — no separate service file needed.
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


class MicrosoftOAuthProvider(AbstractOAuthProvider):
    """
    Microsoft OAuth 2.0 provider (Authorization Code Flow).

    Implements the full flow: authorization URL → code exchange →
    user profile (via Graph API) → ConnectedAccount persistence →
    token refresh.
    """

    def __init__(self) -> None:
        self.client_id = settings.MICROSOFT_CLIENT_ID
        self.client_secret = settings.MICROSOFT_CLIENT_SECRET
        self.tenant_id = settings.MICROSOFT_TENANT_ID or "common"
        self.redirect_uri = settings.MICROSOFT_REDIRECT_URI

        self.auth_base_url = (
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"
        )
        self.token_url = (
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        )

        self.scopes = [
            "openid",
            "profile",
            "offline_access",
            "User.Read",
            "Calendars.Read",
            "Calendars.Read.Shared",
            "OnlineMeetings.Read",
            "Team.ReadBasic.All",
        ]

    # ------------------------------------------------------------------
    # Authorization URL
    # ------------------------------------------------------------------

    def get_authorization_url(
        self, state: str, redirect_uri: Optional[str] = None
    ) -> str:
        r_uri = redirect_uri or self.redirect_uri
        if not self.client_id or not r_uri:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Microsoft OAuth configuration is incomplete.",
            )
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": r_uri,
            "response_mode": "query",
            "scope": " ".join(self.scopes),
            "state": state,
            "prompt": "select_account",
        }
        url = f"{self.auth_base_url}?{urllib.parse.urlencode(params)}"
        logger.info(f"[Microsoft] Authorization URL generated | state={state}")
        return url

    # ------------------------------------------------------------------
    # Token Exchange
    # ------------------------------------------------------------------

    async def exchange_code(
        self, code: str, redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        r_uri = redirect_uri or self.redirect_uri
        if not self.client_id or not self.client_secret or not r_uri:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Microsoft OAuth configuration is incomplete.",
            )

        data = {
            "client_id": self.client_id,
            "scope": " ".join(self.scopes),
            "code": code,
            "redirect_uri": r_uri,
            "grant_type": "authorization_code",
            "client_secret": self.client_secret,
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("[Microsoft] Exchanging authorization code for tokens.")
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
                        f"[Microsoft] Token exchange failed: {response.status_code} {msg}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Microsoft token exchange failed: {msg}",
                    )

                tokens = response.json()
                logger.info("[Microsoft] Token exchange successful.")
                return {
                    "access_token": tokens.get("access_token"),
                    "refresh_token": tokens.get("refresh_token"),
                    "expires_in": tokens.get("expires_in", 3600),
                    "token_type": tokens.get("token_type", "Bearer"),
                    "scope": tokens.get("scope"),
                }

            except httpx.RequestError as exc:
                logger.error(f"[Microsoft] Network error during token exchange: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft authorization servers.",
                )

    # ------------------------------------------------------------------
    # User Profile (Microsoft Graph)
    # ------------------------------------------------------------------

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("[Microsoft] Fetching user profile via Graph API.")
                response = await client.get(
                    "https://graph.microsoft.com/v1.0/me",
                    headers=headers,
                    timeout=10.0,
                )

                if response.status_code != 200:
                    msg = response.text or "Graph API error"
                    logger.error(
                        f"[Microsoft] Graph API profile fetch failed: {response.status_code} {msg}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Microsoft Graph API request failed: {msg}",
                    )

                data = response.json()
                return {
                    "provider_user_id": data.get("id"),
                    "display_name": data.get("displayName"),
                    "email": data.get("mail") or data.get("userPrincipalName"),
                }

            except httpx.RequestError as exc:
                logger.error(f"[Microsoft] Network error fetching Graph profile: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft Graph API servers.",
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
                detail="Microsoft OAuth configuration is incomplete.",
            )

        decrypted = decrypt_value(refresh_token)
        data = {
            "client_id": self.client_id,
            "scope": " ".join(self.scopes),
            "refresh_token": decrypted,
            "grant_type": "refresh_token",
            "client_secret": self.client_secret,
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("[Microsoft] Refreshing access token.")
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
                        f"[Microsoft] Token refresh failed: {response.status_code} {msg}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Microsoft refresh token failed: {msg}",
                    )

                tokens = response.json()
                logger.info("[Microsoft] Token refresh successful.")
                return tokens

            except httpx.RequestError as exc:
                logger.error(f"[Microsoft] Network error during token refresh: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft servers for token refresh.",
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
            f"[Microsoft] Saving ConnectedAccount | user_id={user_id} "
            f"provider_user_id={provider_user_id} email={email} expires_at={expires_at}"
        )

        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == Provider.MICROSOFT,
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
            account.needs_reauth = False
        else:
            account = ConnectedAccount(
                user_id=user_id,
                provider=Provider.MICROSOFT,
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
            )
            db.add(account)

        try:
            db.commit()
            db.refresh(account)
            return account
        except Exception as exc:
            db.rollback()
            logger.error(f"[Microsoft] Failed to persist ConnectedAccount: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist Microsoft ConnectedAccount to database.",
            )
