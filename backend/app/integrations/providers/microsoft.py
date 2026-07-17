"""
Microsoft OAuth Provider

Thin implementation of BaseOAuthProvider containing only Microsoft-specific logic.
"""

from typing import Any, Dict

from app.config.settings import settings
from app.integrations.providers.common import BaseOAuthProvider
from app.models.models import Provider


class MicrosoftOAuthProvider(BaseOAuthProvider):
    """
    Microsoft OAuth 2.0 provider (Authorization Code Flow).
    """

    provider_name = "Microsoft"
    provider_enum = Provider.MICROSOFT

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
        self.userinfo_url = "https://graph.microsoft.com/v1.0/me"

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

    def get_extra_auth_params(self) -> Dict[str, str]:
        return {
            "response_mode": "query",
            "prompt": "select_account",
        }

    # ------------------------------------------------------------------
    # User Profile (Microsoft Graph)
    # ------------------------------------------------------------------

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }
        data = await self._get(self.userinfo_url, headers, "Graph API profile fetch")

        return {
            "provider_user_id": data.get("id"),
            "display_name": data.get("displayName"),
            "email": data.get("mail") or data.get("userPrincipalName"),
        }
