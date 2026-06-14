"""Authentication endpoints."""

import logging
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, FRONTEND_URL
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.crud.user import (
    clear_reset_token,
    create_user,
    get_user,
    get_user_by_email,
    get_user_by_login_identifier,
    get_user_by_reset_token,
    set_reset_token,
    user_exists,
)
from app.schemas.user import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserPublic,
    UserUpdate,
)
from app.services.notifier import send_email_notification
from app.services.templates import (
    get_password_reset_email_template,
    get_welcome_email_template,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserPublic, status_code=201)
async def register(
    user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """Register a new caregiver (cuidador)."""
    if user_exists(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed = get_password_hash(user.password)
    db_user = create_user(
        db=db,
        username=user.username,
        hashed_password=hashed,
        tax_id=user.tax_id,
        full_name=user.full_name,
        email=user.email,
    )

    # Send welcome email if email is provided
    if user.email:
        html_body = get_welcome_email_template(
            full_name=user.full_name or "", username=user.username
        )
        background_tasks.add_task(
            send_email_notification,
            user.email,
            "Bem-vindo ao Smart Dispenser! 🎉",
            html_body,
        )

    return UserPublic(
        username=db_user.username,
        full_name=db_user.full_name,
        email=db_user.email,
        notifications_enabled=db_user.notifications_enabled,
    )


@router.post("/login", response_model=TokenResponse)
async def login(form: LoginRequest, db: Session = Depends(get_db)):
    """Login and return JWT token."""
    logger.info("Login attempt started for identifier=%s", form.username)
    user = get_user_by_login_identifier(db, form.username)
    if not user:
        logger.warning("Login failed: user not found for identifier=%s", form.username)
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not verify_password(form.password, user.hashed_password):
        logger.warning(
            "Login failed: invalid password for identifier=%s", form.username
        )
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    logger.info("Login succeeded for username=%s", user.username)
    return TokenResponse(access_token=access_token)


@router.get("/profile", response_model=UserPublic)
async def get_profile(current_user=Depends(get_current_user)):
    """Return profile of logged-in caregiver."""
    return UserPublic(
        username=current_user.username,
        full_name=current_user.full_name,
        email=current_user.email,
        notifications_enabled=current_user.notifications_enabled,
    )


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Request a password reset email. Always returns 200 to avoid email enumeration."""
    user = get_user_by_email(db, body.email)
    logger.info("fetch user")

    if user:
        logger.info("found")
        token = set_reset_token(db, user)
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        html_body = get_password_reset_email_template(
            full_name=user.full_name or "",
            reset_url=reset_url,
        )
        logger.info(reset_url)
        background_tasks.add_task(
            send_email_notification,
            user.email,
            "Redefinição de senha — Smart Dispenser",
            html_body,
        )

    return {
        "message": "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha."
    }


@router.post("/reset-password", status_code=200)
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset a user's password using a valid reset token."""
    user = get_user_by_reset_token(db, body.token)
    if not user:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado.")
    user.hashed_password = get_password_hash(body.new_password)
    clear_reset_token(db, user)
    return {"message": "Senha redefinida com sucesso."}


@router.patch("/profile", response_model=UserPublic)
async def update_profile(
    profile_data: UserUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile of logged-in caregiver (including notification settings)."""
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.email is not None:
        current_user.email = profile_data.email
    if profile_data.notifications_enabled is not None:
        current_user.notifications_enabled = profile_data.notifications_enabled
    db.commit()
    db.refresh(current_user)
    return UserPublic(
        username=current_user.username,
        full_name=current_user.full_name,
        email=current_user.email,
        notifications_enabled=current_user.notifications_enabled,
    )
