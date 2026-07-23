"""
Common OAuth Provider Implementation

Shared base class for all OAuth providers, abstracting HTTP logic,
configuration validation, token exchange, refresh, and persistence.
"""

import logging
import urllib.parse
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, List, Union

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.integrations.providers.base import AbstractOAuthProvider
from app.models.models import ConnectedAccount, Provider
from app.utils.encryption import encrypt_value, decrypt_value

logger = logging.getLogger(__name__)


class BaseOAuthProvider(AbstractOAuthProvider):
    """
    Base implementation for OAuth 2.0 providers.

    Provides shared logic for:
      - Configuration validation
      - Authorization URL building
      - HTTP requests with robust error handling
      - Token exchange & refresh
      - Database persistence & token encryption
    """

    # These must be set by subclasses
    provider_name: str
    provider_enum: Provider

    client_id: str
    client_secret: str
    redirect_uri: str
    auth_base_url: str
    token_url: str
    userinfo_url: str
    scopes: Union[List[str], str]

    # ------------------------------------------------------------------
    # Logging & Validation
    # ------------------------------------------------------------------

    def _log_debug(self, message: str) -> None:
        logger.debug(f"[{self.provider_name}] {message}")

    def _log_info(self, message: str) -> None:
        logger.info(f"[{self.provider_name}] {message}")

    def _log_error(self, message: str) -> None:
        logger.error(f"[{self.provider_name}] {message}")

    def _validate_client_configuration(self, redirect_uri: Optional[str] = None) -> str:
        r_uri = redirect_uri or self.redirect_uri
        if not self.client_id or not self.client_secret or not r_uri:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{self.provider_name} OAuth configuration is incomplete.",
            )
        return r_uri

    def _validate_response(
        self, response: httpx.Response, action_name: str
    ) -> Dict[str, Any]:
        if response.status_code != 200:
            try:
                err = response.json()
                msg = (
                    err.get("error_description")
                    or err.get("error")
                    or err.get("reason")
                    or f"{action_name} error"
                )
            except Exception:
                msg = response.text or f"{action_name} error"

            self._log_error(f"{action_name} failed: {response.status_code} {msg}")

            status_code = status.HTTP_400_BAD_REQUEST
            if action_name == "Token refresh":
                status_code = status.HTTP_401_UNAUTHORIZED

            raise HTTPException(
                status_code=status_code,
                detail=f"{self.provider_name} {action_name.lower()} failed: {msg}",
            )
        return response.json()

    # ------------------------------------------------------------------
    # HTTP Helpers
    # ------------------------------------------------------------------

    async def _post(
        self,
        url: str,
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
        action_name: str = "Request",
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                self._log_debug(f"{action_name} starting.")
                response = await client.post(
                    url, data=data, headers=headers, timeout=10.0
                )
                return self._validate_response(response, action_name)
            except httpx.RequestError as exc:
                self._log_error(f"Network error during {action_name.lower()}: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to connect to {self.provider_name} servers.",
                )

    async def _get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        action_name: str = "Request",
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                self._log_debug(f"{action_name} starting.")
                response = await client.get(url, headers=headers, timeout=10.0)
                return self._validate_response(response, action_name)
            except httpx.RequestError as exc:
                self._log_error(f"Network error during {action_name.lower()}: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to connect to {self.provider_name} servers.",
                )

    # ------------------------------------------------------------------
    # URL Builder
    # ------------------------------------------------------------------

    def get_authorization_url(
        self, state: str, redirect_uri: Optional[str] = None
    ) -> str:
        r_uri = redirect_uri or self.redirect_uri
        if not self.client_id or not r_uri:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{self.provider_name} OAuth configuration is incomplete.",
            )

        scope_str = (
            " ".join(self.scopes) if isinstance(self.scopes, list) else self.scopes
        )

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": r_uri,
            "state": state,
        }
        if scope_str:
            params["scope"] = scope_str

        extra_params = self.get_extra_auth_params()
        if extra_params:
            params.update(extra_params)

        url = f"{self.auth_base_url}?{urllib.parse.urlencode(params)}"
        self._log_debug(f"Authorization URL generated | state={state}")
        return url

    def get_extra_auth_params(self) -> Dict[str, str]:
        """Override in subclass to provide provider-specific query parameters."""
        return {}

    # ------------------------------------------------------------------
    # Token Operations
    # ------------------------------------------------------------------

    def build_token_payload(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

    def build_refresh_payload(self, refresh_token: str) -> Dict[str, Any]:
        return {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

    def build_token_headers(self) -> Dict[str, str]:
        return {"Content-Type": "application/x-www-form-urlencoded"}

    async def exchange_code(
        self, code: str, redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        r_uri = self._validate_client_configuration(redirect_uri)
        data = self.build_token_payload(code, r_uri)
        headers = self.build_token_headers()

        tokens = await self._post(self.token_url, data, headers, "Token exchange")

        self._log_debug("Token exchange successful.")
        return {
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": tokens.get("expires_in", 3600),
            "token_type": tokens.get("token_type", "Bearer"),
            "scope": tokens.get("scope"),
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        self._validate_client_configuration()
        decrypted = decrypt_value(refresh_token)
        data = self.build_refresh_payload(decrypted)
        headers = self.build_token_headers()

        tokens = await self._post(self.token_url, data, headers, "Token refresh")
        self._log_debug("Token refresh successful.")
        return tokens

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

        self._log_debug(
            f"Saving ConnectedAccount | user_id={user_id} "
            f"provider_user_id={provider_user_id} email={email} expires_at={expires_at}"
        )

        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == self.provider_enum,
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

            # Reset fields that were present in microsoft
            if hasattr(account, "needs_reauth"):
                account.needs_reauth = False
        else:
            account = ConnectedAccount(
                user_id=user_id,
                provider=self.provider_enum,
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
            self._log_error(f"Failed to persist ConnectedAccount: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist {self.provider_name} ConnectedAccount to database.",
            )
