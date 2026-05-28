"""User-related Pydantic schemas."""

from typing import Optional
import re
from pydantic import BaseModel, field_validator


class UserCreate(BaseModel):
    """Schema for user registration."""

    username: str
    password: str
    tax_id: str
    full_name: str
    email: Optional[str] = None

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('A senha deve ter no mínimo 8 caracteres.')
        return v

    @field_validator('email')
    @classmethod
    def email_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
            if not re.match(regex, v):
                raise ValueError('Formato de e-mail inválido.')
        return v


class UserPublic(BaseModel):
    """Schema for public user information (no password)."""

    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    notifications_enabled: bool = True


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = None
    email: Optional[str] = None
    notifications_enabled: Optional[bool] = None


class LoginRequest(BaseModel):
    """Schema for login request."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
