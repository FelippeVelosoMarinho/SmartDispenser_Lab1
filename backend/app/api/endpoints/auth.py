"""Authentication endpoints."""

from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends

from app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.crud.user import create_user, get_user, user_exists
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=201)
async def register(user: UserCreate):
    """Register a new caregiver (cuidador)."""
    if user_exists(user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    hashed = get_password_hash(user.password)
    create_user(
        username=user.username,
        hashed_password=hashed,
        full_name=user.full_name,
        email=user.email,
    )

    return UserPublic(
        username=user.username,
        full_name=user.full_name,
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
async def login(form: LoginRequest):
    """Login and return JWT token."""
    user = get_user(form.username)
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password"
        )

    if not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires
    )
    return TokenResponse(access_token=access_token)


@router.get("/profile", response_model=UserPublic)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Return profile of logged-in caregiver."""
    return UserPublic(
        username=current_user["username"],
        full_name=current_user.get("full_name"),
        email=current_user.get("email"),
    )
