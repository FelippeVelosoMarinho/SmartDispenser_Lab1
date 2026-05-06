"""User-related Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    """Schema for user registration."""

    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None


class UserPublic(BaseModel):
    """Schema for public user information (no password)."""

    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    """Schema for login request."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
