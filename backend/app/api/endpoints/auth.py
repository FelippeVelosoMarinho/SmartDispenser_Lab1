"""Authentication endpoints."""

from datetime import timedelta
import logging
from fastapi import APIRouter, HTTPException, Depends

from app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.database import get_db
from app.crud.user import create_user, get_user, get_user_by_login_identifier, user_exists
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserPublic
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserPublic, status_code=201)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new caregiver (cuidador)."""
    if user_exists(db, user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    hashed = get_password_hash(user.password)
    create_user(
        db=db,
        username=user.username,
        hashed_password=hashed,
        tax_id=user.tax_id,
        full_name=user.full_name,
        email=user.email,
    )

    return UserPublic(
        username=user.username,
        full_name=user.full_name,
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
async def login(form: LoginRequest, db: Session = Depends(get_db)):
    """Login and return JWT token."""
    logger.info("Login attempt started for identifier=%s", form.username)
    user = get_user_by_login_identifier(db, form.username)
    if not user:
        logger.warning("Login failed: user not found for identifier=%s", form.username)
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password"
        )

    if not verify_password(form.password, user.hashed_password):
        logger.warning("Login failed: invalid password for identifier=%s", form.username)
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    logger.info("Login succeeded for username=%s", user.username)
    return TokenResponse(access_token=access_token)


@router.get("/profile", response_model=UserPublic)
async def get_profile(current_user = Depends(get_current_user)):
    """Return profile of logged-in caregiver."""
    return UserPublic(
        username=current_user.username,
        full_name=current_user.full_name,
        email=current_user.email,
    )
