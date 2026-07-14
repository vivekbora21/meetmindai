from pydantic import BaseModel, EmailStr, field_validator


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_name: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


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
