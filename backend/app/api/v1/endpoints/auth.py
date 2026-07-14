import logging
import secrets
import time
import threading
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.config.settings import get_env
from app.models.models import User, Organization
from app.schemas.auth import UserRegister, Token, UserOut
from app.helpers.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    generate_social_login_state,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.integrations.registry import get_provider

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Rate Limiting
# ---------------------------------------------------------------------------


class InMemoryLimiter:
    """Thread-safe, sliding-window rate limiter for protecting endpoints."""

    def __init__(self, requests_limit: int = 5, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history = defaultdict(list)
        self.lock = threading.Lock()

    def is_allowed(self, ip: str) -> bool:
        now = time.time()
        with self.lock:
            # Filter out timestamps older than the sliding window
            self.history[ip] = [
                t for t in self.history[ip] if now - t < self.window_seconds
            ]
            if len(self.history[ip]) >= self.requests_limit:
                return False
            self.history[ip].append(now)
            return True


login_limiter = InMemoryLimiter(requests_limit=5, window_seconds=60)


# ---------------------------------------------------------------------------
# Auth Router Endpoints
# ---------------------------------------------------------------------------


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user and automatically create their organization.

    This operates inside a single atomic database transaction to prevent
    orphaned Organization rows if User creation fails.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        logger.warning(
            f"Registration failed: Email {user_in.email} already registered."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    try:
        # Create Organization first
        org = Organization(name=user_in.organization_name)
        db.add(org)
        # Flush to get the org.id without committing early
        db.flush()

        # Create user as Organization Admin
        hashed_pwd = get_password_hash(user_in.password)
        user = User(
            name=user_in.name,
            email=user_in.email,
            hashed_password=hashed_pwd,
            organization_id=org.id,
            role="Admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(
            f"Successfully registered new user: {user.email} with organization: {org.name}"
        )
        return user
    except Exception as e:
        db.rollback()
        logger.exception("Registration transaction failed and was rolled back.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to an internal error.",
        )


@router.post("/token", response_model=Token)
def login_for_access_token(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Authenticate a user using their email and password, issuing access and CSRF tokens.

    Rate limited to approximately 5 requests per minute per IP address.
    """
    # Rate limit check
    client_host = request.client.host if request.client else "unknown"
    if not login_limiter.is_allowed(client_host):
        logger.warning(f"Rate limit exceeded for IP: {client_host} on /token")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

    # Normalize username (email)
    username = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed authentication attempt for email: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert user.id to string to guarantee sub claim is a string
    access_token = create_access_token(
        data={"sub": str(user.id), "org": user.organization_id, "role": user.role}
    )

    # Generate a CSRF token for double-submit cookie pattern
    csrf_token = secrets.token_urlsafe(32)

    # Set secure HTTP-only cookie for the session access token
    secure_cookie = get_env("PYTHON_ENV", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        samesite="lax",
        secure=secure_cookie,
    )

    # Set a separate non-httponly cookie for CSRF token (so JS client can read and send it back as header)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        samesite="lax",
        secure=secure_cookie,
    )

    logger.info(f"Successfully authenticated user: {user.email}")

    # Note: The access_token is returned in both the httponly cookie and the JSON response body
    # because the frontend login client (e.g. login/page.tsx) verifies the presence of `access_token`
    # in the JSON response before proceeding with client-side routing.
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "organization_id": user.organization_id,
        "role": user.role,
    }


@router.post("/logout")
def logout(response: Response):
    """
    Log out the user by clearing both the access token and CSRF token cookies.
    """
    secure_cookie = get_env("PYTHON_ENV", "development") == "production"
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="lax",
        secure=secure_cookie,
    )
    response.delete_cookie(
        key="csrf_token",
        path="/",
        samesite="lax",
        secure=secure_cookie,
    )
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get the profile data of the currently logged-in user.
    """
    return current_user


@router.get("/social/{provider}/login")
def social_login(
    provider: str,
):
    """
    Initiate OAuth login flow for a given social provider.

    Generates a secure state parameter.
    """
    oauth_provider = get_provider(provider)
    state = generate_social_login_state(provider)

    # Use the registered callback URI from provider config to avoid redirect_uri_mismatch
    redirect_uri = oauth_provider.redirect_uri
    auth_url = oauth_provider.get_authorization_url(state, redirect_uri=redirect_uri)
    return RedirectResponse(url=auth_url)
