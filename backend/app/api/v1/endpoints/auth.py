from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from jwt.exceptions import InvalidTokenError

import bcrypt

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
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.config.settings import get_env
from app.models.models import User, Organization
from app.services.microsoft_oauth import MicrosoftOAuthService
from app.services.graph_service import MicrosoftGraphService
from app.services.google_oauth import GoogleOAuthService


# JWT Configurations
SECRET_KEY = get_env(
    "JWT_SECRET", "supersecretkeymeetingmind_secure_key_at_least_32_bytes_long"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = HTTPBearer(auto_error=False)

router = APIRouter()


# Pydantic validation schemas
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    organization_id: str
    role: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    organization_id: str
    role: str

    class Config:
        from_attributes = True


# Helper functions
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


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


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create Organization first
    org = Organization(name=user_in.organization_name)
    db.add(org)
    db.commit()
    db.refresh(org)
    print("inside register function")

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
    return user


@router.post("/token", response_model=Token)
def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.id, "org": user.organization_id, "role": user.role}
    )

    # Set secure HTTP-only cookie, matching RecruitEase Pro production logic
    secure_cookie = get_env("PYTHON_ENV", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=secure_cookie,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "organization_id": user.organization_id,
        "role": user.role,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# Microsoft OAuth Router
microsoft_router = APIRouter()
oauth_service = MicrosoftOAuthService()
graph_service = MicrosoftGraphService()


@microsoft_router.get("/api/auth/microsoft/login")
def microsoft_login(
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to initiate Microsoft OAuth flow.
    Generates a secure state parameter, stores it in a cookie, and redirects user to Microsoft Login.
    """
    try:
        state = oauth_service.generate_state()
        auth_url = oauth_service.get_authorization_url(state)
        
        redirect_response = RedirectResponse(url=auth_url)
        
        secure_cookie = get_env("PYTHON_ENV", "development") == "production"
        redirect_response.set_cookie(
            key="microsoft_oauth_state",
            value=state,
            httponly=True,
            max_age=300,  # 5 minutes
            samesite="lax",
            secure=secure_cookie
        )
        return redirect_response
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error initiating Microsoft login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initiate Microsoft login: {str(e)}"
        )


@microsoft_router.get("/api/auth/microsoft/callback")
async def microsoft_callback(
    request: Request,
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for Microsoft OAuth callback.
    Validates state, exchanges authorization code for tokens, retrieves profile details from Graph API,
    and updates/creates ConnectedAccount db record.
    """
    if error:
        logger.error(f"Microsoft login returned error: {error} - {error_description}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Microsoft login error: {error_description or error}"
        )

    if not code:
        logger.error("Missing authorization code in Microsoft callback.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is missing."
        )

    if not state:
        logger.error("Missing state parameter in Microsoft callback.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State parameter is missing."
        )

    cookie_state = request.cookies.get("microsoft_oauth_state")
    if not cookie_state or cookie_state != state:
        logger.error(f"State validation failed. Received: {state}, Cookie: {cookie_state}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter. Possible CSRF attack detected."
        )

    # Clear state cookie
    response.delete_cookie(key="microsoft_oauth_state")

    try:
        tokens = await oauth_service.exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in")
        token_type = tokens.get("token_type", "Bearer")

        if not access_token:
            logger.error("No access token returned from Microsoft.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve access token from Microsoft."
            )

        graph_user = await graph_service.get_me(access_token)
        graph_user_id = graph_user.get("id")
        display_name = graph_user.get("displayName")
        email = graph_user.get("mail") or graph_user.get("userPrincipalName")

        if not graph_user_id:
            logger.error("No Graph user ID returned from Microsoft Graph API.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user profile from Microsoft Graph API."
            )

        oauth_service.save_or_update_microsoft_account(
            db=db,
            user_id=current_user.id,
            graph_user_id=graph_user_id,
            display_name=display_name,
            email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            expires_in=expires_in
        )

        host = request.url.hostname or "localhost"
        frontend_url = f"http://{host}:3000/settings?sync=success"
        return RedirectResponse(url=frontend_url)

    except HTTPException as he:
        import urllib.parse
        host = request.url.hostname or "localhost"
        return RedirectResponse(url=f"http://{host}:3000/settings?sync=error&detail={urllib.parse.quote(he.detail)}")
    except Exception as e:
        import urllib.parse
        logger.error(f"Unexpected error in Microsoft callback: {e}")
        host = request.url.hostname or "localhost"
        return RedirectResponse(url=f"http://{host}:3000/settings?sync=error&detail={urllib.parse.quote(str(e))}")


# Google OAuth Router
google_router = APIRouter()
google_oauth_service = GoogleOAuthService()


@google_router.get("/api/auth/google/login")
def google_login(
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to initiate Google OAuth flow.
    Generates a secure state parameter, stores it in a cookie, and redirects user to Google Login.
    """
    try:
        state = google_oauth_service.generate_state()
        auth_url = google_oauth_service.get_authorization_url(state)
        
        redirect_response = RedirectResponse(url=auth_url)
        
        secure_cookie = get_env("PYTHON_ENV", "development") == "production"
        redirect_response.set_cookie(
            key="google_oauth_state",
            value=state,
            httponly=True,
            max_age=300,  # 5 minutes
            samesite="lax",
            secure=secure_cookie
        )
        return redirect_response
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error initiating Google login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initiate Google login: {str(e)}"
        )


@google_router.get("/api/auth/google/callback")
async def google_callback(
    request: Request,
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for Google OAuth callback.
    Validates state, exchanges authorization code for tokens, retrieves profile details,
    and updates/creates ConnectedAccount db record.
    """
    if error:
        logger.error(f"Google login returned error: {error} - {error_description}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google login error: {error_description or error}"
        )

    if not code:
        logger.error("Missing authorization code in Google callback.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is missing."
        )

    if not state:
        logger.error("Missing state parameter in Google callback.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State parameter is missing."
        )

    cookie_state = request.cookies.get("google_oauth_state")
    if not cookie_state or cookie_state != state:
        logger.error(f"State validation failed. Received: {state}, Cookie: {cookie_state}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter. Possible CSRF attack detected."
        )

    # Clear state cookie
    response.delete_cookie(key="google_oauth_state")

    try:
        tokens = await google_oauth_service.exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        token_type = tokens.get("token_type", "Bearer")
        scope = tokens.get("scope")

        if not access_token:
            logger.error("No access token returned from Google.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve access token from Google."
            )

        # Fetch Google user profile info
        user_info = await google_oauth_service.get_user_info(access_token)
        google_user_id = user_info.get("id")
        display_name = user_info.get("name") or user_info.get("given_name", "")
        email = user_info.get("email")

        if not google_user_id or not email:
            logger.error("Failed to retrieve essential user profile info from Google.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve profile details from Google."
            )

        google_oauth_service.save_or_update_google_account(
            db=db,
            user_id=current_user.id,
            google_user_id=google_user_id,
            display_name=display_name,
            email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            expires_in=expires_in,
            scope=scope
        )

        host = request.url.hostname or "localhost"
        frontend_url = f"http://{host}:3000/settings?sync=success"
        return RedirectResponse(url=frontend_url)

    except HTTPException as he:
        import urllib.parse
        host = request.url.hostname or "localhost"
        return RedirectResponse(url=f"http://{host}:3000/settings?sync=error&detail={urllib.parse.quote(he.detail)}")
    except Exception as e:
        import urllib.parse
        logger.error(f"Unexpected error in Google callback: {e}")
        host = request.url.hostname or "localhost"
        return RedirectResponse(url=f"http://{host}:3000/settings?sync=error&detail={urllib.parse.quote(str(e))}")


