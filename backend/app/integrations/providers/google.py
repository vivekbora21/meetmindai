"""
Google OAuth Provider

Thin implementation of BaseOAuthProvider containing only Google-specific logic.
"""

from typing import Any, Dict

from app.config.settings import settings
from app.integrations.providers.common import BaseOAuthProvider
from app.models.models import Provider


class GoogleOAuthProvider(BaseOAuthProvider):
    """
    Google OAuth 2.0 provider (Authorization Code Flow).
    """

    provider_name = "Google"
    provider_enum = Provider.GOOGLE

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

    def get_extra_auth_params(self) -> Dict[str, str]:
        return {
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }

    # ------------------------------------------------------------------
    # User Profile
    # ------------------------------------------------------------------

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {access_token}"}
        data = await self._get(self.userinfo_url, headers, "Profile fetch")

        name = data.get("name") or data.get("given_name", "")
        return {
            "provider_user_id": data.get("id"),
            "display_name": name,
            "email": data.get("email"),
        }
