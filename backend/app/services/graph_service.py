import logging
from typing import Dict, Any
import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class MicrosoftGraphService:
    """
    Service to interact with the Microsoft Graph API.
    Provides methods to retrieve authenticated user details.
    """

    async def get_me(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieves user profile details using GET /v1.0/me.
        """
        url = "https://graph.microsoft.com/v1.0/me"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                logger.info("Fetching Microsoft user profile details via Graph API.")
                response = await client.get(url, headers=headers, timeout=10.0)

                if response.status_code != 200:
                    error_msg = response.text or "Unknown Graph API error"
                    logger.error(f"Failed to fetch profile details: {response.status_code} - {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Microsoft Graph API request failed: {error_msg}"
                    )

                profile_data = response.json()
                logger.info(f"Successfully retrieved profile: {profile_data.get('displayName')}")
                return {
                    "id": profile_data.get("id"),
                    "displayName": profile_data.get("displayName"),
                    "mail": profile_data.get("mail"),
                    "userPrincipalName": profile_data.get("userPrincipalName")
                }

            except httpx.RequestError as exc:
                logger.error(f"Network error communicating with Microsoft Graph API: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to connect to Microsoft Graph API servers."
                )

    async def authenticated_get(self, url: str, access_token: str) -> Dict[str, Any]:
        """
        Utility function to execute arbitrary authenticated GET requests to Microsoft Graph.
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Executing authenticated GET request to URL: {url}")
                response = await client.get(url, headers=headers, timeout=10.0)
                if response.status_code != 200:
                    error_msg = response.text or "Request failed"
                    logger.error(f"Graph API GET failed: {response.status_code} - {error_msg}")
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Microsoft Graph API error: {error_msg}"
                    )
                return response.json()
            except httpx.RequestError as exc:
                logger.error(f"Network error during Graph API GET request: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Network error occurred during Graph API request."
                )
