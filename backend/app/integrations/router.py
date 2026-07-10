"""
Generic Integration Router

Replaces the separate microsoft_router, google_router, and zoom_router
that previously lived in auth.py.

Routes:
  GET /api/auth/{provider}/login      → initiate OAuth flow
  GET /api/auth/{provider}/callback   → handle OAuth callback

These URL patterns are fully backward compatible:
  /api/auth/microsoft/login  == /api/auth/{provider}/login with provider=microsoft
  /api/auth/google/callback  == /api/auth/{provider}/callback with provider=google
  ... etc.

The router validates the provider via the registry, then delegates
all provider-specific logic to the correct AbstractOAuthProvider
implementation.  No provider-specific logic lives here.
"""

import urllib.parse
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.models import User
from app.integrations.registry import get_provider
from app.api.v1.endpoints.auth import (
    get_current_user,
    generate_signed_state,
    verify_signed_state,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Connect (Login / Initiate OAuth)
# ---------------------------------------------------------------------------


@router.get("/api/auth/{provider}/login")
def provider_login(
    provider: str,
    current_user: User = Depends(get_current_user),
) -> RedirectResponse:
    """
    Initiate the OAuth flow for the specified provider.

    Steps:
      1. Validate provider is registered.
      2. Generate a signed state JWT (CSRF protection).
      3. Build the provider-specific authorization URL.
      4. Redirect the user to the provider's consent screen.
    """
    oauth_provider = get_provider(provider)  # raises 400 if unsupported

    try:
        state = generate_signed_state(current_user.id, provider)
        auth_url = oauth_provider.get_authorization_url(state)
        logger.info(
            f"[IntegrationRouter] OAuth initiated | "
            f"provider={provider} user_id={current_user.id}"
        )
        return RedirectResponse(url=auth_url)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            f"[IntegrationRouter] Failed to initiate OAuth | "
            f"provider={provider} error={exc}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initiate {provider} OAuth flow: {exc}",
        )


# ---------------------------------------------------------------------------
# Callback (Code Exchange)
# ---------------------------------------------------------------------------


@router.get("/api/auth/{provider}/callback")
async def provider_callback(
    provider: str,
    request: Request,
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """
    Handle the OAuth callback for the specified provider.

    Steps:
      1. Validate provider is registered.
      2. Check for OAuth errors returned by the provider.
      3. Validate the signed state JWT and extract user_id.
      4. Exchange the authorization code for tokens.
      5. Fetch the user's profile from the provider.
      6. Save or update the ConnectedAccount record.
      7. Redirect to the frontend settings page.
    """
    host = request.url.hostname or "localhost"
    success_url = f"http://{host}:3000/settings?sync=success"

    def _error_redirect(detail: str) -> RedirectResponse:
        encoded = urllib.parse.quote(detail)
        return RedirectResponse(
            url=f"http://{host}:3000/settings?sync=error&detail={encoded}"
        )

    # Step 1 — validate provider
    try:
        oauth_provider = get_provider(provider)
    except HTTPException as exc:
        logger.error(
            f"[IntegrationRouter] Unsupported provider in callback: '{provider}'"
        )
        return _error_redirect(exc.detail)

    # Step 2 — surface provider-level errors
    if error:
        logger.error(
            f"[IntegrationRouter] Provider returned error | "
            f"provider={provider} error={error} description={error_description}"
        )
        return _error_redirect(f"{provider} login error: {error_description or error}")

    if not code:
        logger.error(
            f"[IntegrationRouter] Missing authorization code | provider={provider}"
        )
        return _error_redirect("Authorization code is missing.")

    if not state:
        logger.error(
            f"[IntegrationRouter] Missing state parameter | provider={provider}"
        )
        return _error_redirect("State parameter is missing.")

    # Step 3 — validate state and resolve user
    try:
        user_id = verify_signed_state(state, provider)
    except HTTPException as exc:
        return _error_redirect(exc.detail)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return _error_redirect("User associated with state token was not found.")

    try:
        # Step 4 — exchange code for tokens
        tokens = await oauth_provider.exchange_code(code)
        access_token = tokens.get("access_token")

        if not access_token:
            logger.error(
                f"[IntegrationRouter] No access token returned | provider={provider}"
            )
            return _error_redirect(f"Failed to retrieve access token from {provider}.")

        # Step 5 — fetch user profile
        profile = await oauth_provider.get_user_profile(access_token)
        provider_user_id = profile.get("provider_user_id")
        display_name = profile.get("display_name", "")
        email = profile.get("email", "")

        if not provider_user_id:
            logger.error(
                f"[IntegrationRouter] Missing provider_user_id | provider={provider}"
            )
            return _error_redirect(f"Failed to retrieve user profile from {provider}.")

        # Step 6 — persist
        oauth_provider.save_or_update_account(
            db=db,
            user_id=user_id,
            provider_user_id=provider_user_id,
            display_name=display_name,
            email=email,
            access_token=access_token,
            refresh_token=tokens.get("refresh_token"),
            token_type=tokens.get("token_type", "Bearer"),
            expires_in=tokens.get("expires_in", 3600),
            scope=tokens.get("scope"),
        )

        logger.info(
            f"[IntegrationRouter] OAuth callback complete | "
            f"provider={provider} user_id={user_id} email={email}"
        )

        # Step 7 — redirect to frontend
        return RedirectResponse(url=success_url)

    except HTTPException as exc:
        return _error_redirect(exc.detail)
    except Exception as exc:
        logger.error(
            f"[IntegrationRouter] Unexpected error in callback | "
            f"provider={provider} error={exc}"
        )
        return _error_redirect(str(exc))
