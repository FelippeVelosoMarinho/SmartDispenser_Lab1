"""User CRUD operations (database store)."""

from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.domain import User


def create_user(db: Session, username: str, hashed_password: str, full_name: Optional[str] = None, email: Optional[str] = None) -> User:
    """Create a new user in the database."""
    db_user = User(
        username=username,
        hashed_password=hashed_password,
        full_name=full_name,
        email=email
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, username: str) -> Optional[User]:
    """Get a user by username."""
    return db.query(User).filter(User.username == username).first()


def user_exists(db: Session, username: str) -> bool:
    """Check if a user exists."""
    return db.query(User).filter(User.username == username).first() is not None


def get_all_users(db: Session) -> List[User]:
    """Get all users."""
    return db.query(User).all()


def delete_user(db: Session, username: str) -> bool:
    """Delete a user. Returns True if user was deleted, False if not found."""
    db_user = db.query(User).filter(User.username == username).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False

