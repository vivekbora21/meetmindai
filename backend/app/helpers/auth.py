from datetime import datetime, timedelta
from typing import Optional
import logging
import secrets
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError
import bcrypt

logger = logging.getLogger(__name__)

# Monkeypatch bcrypt to prevent passlib compatibility crashes
if not hasattr(bcrypt, "__about__"):

    class AboutClass:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")

    bcrypt.__about__ = AboutClass()

# Monkeypatch bcrypt functions to prevent ValueError: password cannot be longer than 72 bytes
orig_hashpw = bcrypt.hashpw


def patched_hashpw(password, salt):
    if isinstance(password, str):
        password_bytes = password.encode("utf-8")
    else:
        password_bytes = password
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return orig_hashpw(password_bytes, salt)


bcrypt.hashpw = patched_hashpw

orig_checkpw = bcrypt.checkpw


def patched_checkpw(password, hashed_password):
    if isinstance(password, str):
        password_bytes = password.encode("utf-8")
    else:
        password_bytes = password
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return orig_checkpw(password_bytes, hashed_password)


bcrypt.checkpw = patched_checkpw

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.config.settings import settings
from app.models.models import User

# JWT Configurations
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = HTTPBearer(auto_error=False)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data (dict): The payload data to encode. The 'sub' claim must represent the user ID as a string.
        expires_delta (Optional[timedelta], optional): Token expiration time delta. Defaults to None.

    Returns:
        str: The encoded JWT token string.
    """
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_csrf(request: Request) -> None:
    """
    Verify that the CSRF token in the cookies matches the token in the X-CSRF-Token header.
    Only applied to state-changing HTTP methods (POST, PUT, DELETE, PATCH) when cookie auth is used.
    """
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")

        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            logger.warning(
                f"CSRF validation failed: cookie={csrf_cookie}, header={csrf_header}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed",
            )


def generate_signed_state(user_id: str, provider: str) -> str:
    """
    Generates a secure signed JWT to use as the OAuth state parameter.
    Encodes the user_id and provider to prevent CSRF attacks.
    """
    payload = {
        "user_id": user_id,
        "provider": provider,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_signed_state(state: str, expected_provider: str) -> str:
    """
    Decode and validate the state JWT, returning the authorised user_id.

    Raises:
        HTTPException 400 — if the token is invalid, expired, or the
        provider field does not match the expected provider.
    """
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("provider") != expected_provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid provider in state parameter.",
            )
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing user ID in state parameter.",
            )
        return user_id
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state parameter. Possible CSRF attack detected.",
        )


def generate_social_login_state(provider: str) -> str:
    payload = {
        "action": "social_login",
        "provider": provider,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_social_login_state(state: str, expected_provider: str) -> bool:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("action") != "social_login":
            return False
        if payload.get("provider") != expected_provider:
            return False
        return True
    except InvalidTokenError:
        return False


# Dependency: Get Current User and enforce Tenancy Isolation
def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try header first, fallback to cookie. Safely handle empty, null, or undefined token strings.
    actual_token = credentials.credentials if credentials else None
    if not actual_token or actual_token.strip() in ("", "null", "undefined"):
        actual_token = request.cookies.get("access_token")

    if not actual_token:
        raise credentials_exception

    try:
        payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


# Dependency: Check permissions
class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role",
            )
        return user
