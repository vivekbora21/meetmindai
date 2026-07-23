"""
Zoom OAuth Provider

Thin implementation of BaseOAuthProvider containing only Zoom-specific logic.
"""

import base64
from typing import Any, Dict

from app.config.settings import settings
from app.integrations.providers.common import BaseOAuthProvider
from app.models.models import Provider


class ZoomOAuthProvider(BaseOAuthProvider):
    """
    Zoom OAuth 2.0 provider (Authorization Code Flow).
    """

    provider_name = "Zoom"
    provider_enum = Provider.ZOOM

    SCOPES = "meeting:read:list_meetings user:read:user"

    def __init__(self) -> None:
        self.client_id = settings.ZOOM_CLIENT_ID
        self.client_secret = settings.ZOOM_CLIENT_SECRET
        self.redirect_uri = settings.ZOOM_REDIRECT_URI

        self.auth_base_url = settings.ZOOM_AUTH_URL or "https://zoom.us/oauth/authorize"
        self.token_url = settings.ZOOM_TOKEN_URL or "https://zoom.us/oauth/token"
        self.userinfo_url = f"{settings.ZOOM_API_BASE}/users/me"

        self.scopes = self.SCOPES

    def _basic_auth_header(self) -> str:
        """Returns the Base64-encoded Basic auth header value for Zoom's token endpoint."""
        b64 = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        return f"Basic {b64}"

    def build_token_payload(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        return {
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

    def build_refresh_payload(self, refresh_token: str) -> Dict[str, Any]:
        return {
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

    def build_token_headers(self) -> Dict[str, str]:
        return {
            "Authorization": self._basic_auth_header(),
            "Content-Type": "application/x-www-form-urlencoded",
        }

    # ------------------------------------------------------------------
    # User Profile
    # ------------------------------------------------------------------

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = await self._get(self.userinfo_url, headers, "Profile fetch")

        first = data.get("first_name", "")
        last = data.get("last_name", "")
        display_name = f"{first} {last}".strip() or data.get("email", "")

        return {
            "provider_user_id": data.get("id"),
            "display_name": display_name,
            "email": data.get("email"),
        }
