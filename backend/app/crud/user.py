"""User CRUD operations (database store)."""

import secrets
import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.domain import User


def create_user(db: Session, username: str, hashed_password: str, tax_id: str, full_name: str, email: Optional[str] = None) -> User:
    """Create a new user (caregiver) in the database."""
    db_user = User(
        username=username,
        hashed_password=hashed_password,
        tax_id=tax_id,
        full_name=full_name,
        email=email,
        notifications_enabled=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, username: str) -> Optional[User]:
    """Get a user by username."""
    return db.query(User).filter(User.username == username).first()


def get_user_by_login_identifier(db: Session, identifier: str) -> Optional[User]:
    """Get a user by username or e-mail."""
    return (
        db.query(User)
        .filter((User.username == identifier) | (User.email == identifier))
        .first()
    )


def user_exists(db: Session, username: str) -> bool:
    """Check if a user exists."""
    return db.query(User).filter(User.username == username).first() is not None


def get_all_users(db: Session) -> List[User]:
    """Get all users."""
    return db.query(User).all()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email address."""
    return db.query(User).filter(User.email == email).first()


def set_reset_token(db: Session, user: User, expires_hours: int = 1) -> str:
    """Generate and store a password reset token. Returns the raw token."""
    token = secrets.token_hex(32)
    user.reset_token = token
    user.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=expires_hours)
    db.commit()
    return token


def get_user_by_reset_token(db: Session, token: str) -> Optional[User]:
    """Get a user whose reset token is valid and not expired."""
    now = datetime.datetime.utcnow()
    return (
        db.query(User)
        .filter(User.reset_token == token, User.reset_token_expires > now)
        .first()
    )


def clear_reset_token(db: Session, user: User) -> None:
    """Remove the reset token from a user after successful password reset."""
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()


def delete_user(db: Session, username: str) -> bool:
    """Delete a user. Returns True if user was deleted, False if not found."""
    db_user = db.query(User).filter(User.username == username).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False
