from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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

# JWT Configurations
SECRET_KEY = get_env("JWT_SECRET", "supersecretkeymeetingmind")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token", auto_error=False)

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
def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try header first, fallback to cookie. Safely handle empty, null, or undefined token strings.
    actual_token = token
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
                detail="Operation not permitted for your role"
            )
        return user

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
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
        role="Admin"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/token", response_model=Token)
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.id, "org": user.organization_id, "role": user.role})
    
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
        "role": user.role
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
