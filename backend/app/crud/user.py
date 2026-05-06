"""User CRUD operations (in-memory store)."""

from typing import Optional, Dict

# Simple in-memory user store (username -> user dict)
USERS: Dict[str, dict] = {}


def create_user(username: str, hashed_password: str, full_name: Optional[str] = None, email: Optional[str] = None) -> dict:
    """Create a new user in the store."""
    user = {
        "username": username,
        "hashed_password": hashed_password,
        "full_name": full_name,
        "email": email,
    }
    USERS[username] = user
    return user


def get_user(username: str) -> Optional[dict]:
    """Get a user by username."""
    return USERS.get(username)


def user_exists(username: str) -> bool:
    """Check if a user exists."""
    return username in USERS


def get_all_users() -> list[dict]:
    """Get all users."""
    return list(USERS.values())


def delete_user(username: str) -> bool:
    """Delete a user. Returns True if user was deleted, False if not found."""
    if username in USERS:
        del USERS[username]
        return True
    return False
