"""
Provider Registry

Single source of truth for all registered OAuth providers.

Adding a new provider requires only:
  1. Create providers/<name>.py implementing AbstractOAuthProvider
  2. Import and add it to PROVIDER_REGISTRY below
  3. No router or service changes needed
"""

import logging
from fastapi import HTTPException, status

from app.integrations.providers.base import AbstractOAuthProvider
from app.integrations.providers.microsoft import MicrosoftOAuthProvider
from app.integrations.providers.google import GoogleOAuthProvider
from app.integrations.providers.zoom import ZoomOAuthProvider

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Registry — map provider name → provider instance
# ---------------------------------------------------------------------------
# Instances are singletons per process; each provider's __init__ is cheap.

PROVIDER_REGISTRY: dict[str, AbstractOAuthProvider] = {
    "microsoft": MicrosoftOAuthProvider(),
    "google": GoogleOAuthProvider(),
    "zoom": ZoomOAuthProvider(),
    # Future providers — uncomment after implementing the provider class:
    # "webex": WebexOAuthProvider(),
    # "slack": SlackOAuthProvider(),
}


def get_provider(provider_name: str) -> AbstractOAuthProvider:
    """
    Retrieve a registered provider by name.

    Args:
        provider_name: The provider key (e.g. "microsoft", "google", "zoom").

    Returns:
        The corresponding AbstractOAuthProvider instance.

    Raises:
        HTTPException 400 — if the provider name is not registered.
    """
    provider = PROVIDER_REGISTRY.get(provider_name.lower())
    if provider is None:
        supported = ", ".join(sorted(PROVIDER_REGISTRY.keys()))
        logger.warning(
            f"Unsupported OAuth provider requested: '{provider_name}'. "
            f"Supported providers: {supported}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported provider '{provider_name}'. "
                f"Supported providers are: {supported}."
            ),
        )
    return provider


def list_providers() -> list[str]:
    """Return a sorted list of all registered provider names."""
    return sorted(PROVIDER_REGISTRY.keys())
