import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_register_user_success():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "pytest_user",
            "password": "strongpassword123",
            "tax_id": "12345678901234",
            "full_name": "Pytest User",
            "email": "pytest@example.com"
        }
    )
    # 201 Created or 400 if user already exists
    assert response.status_code in (201, 400)
    if response.status_code == 201:
        data = response.json()
        assert data["username"] == "pytest_user"
        assert data["email"] == "pytest@example.com"

def test_register_user_weak_password():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "pytest_weak",
            "password": "123", # Less than 8 characters
            "tax_id": "12345678901234",
            "full_name": "Weak Pass User",
            "email": "weak@example.com"
        }
    )
    # Pydantic validation error should return 422 Unprocessable Entity
    assert response.status_code == 422
    error_msg = response.json()["detail"][0]["msg"]
    assert "Value error, A senha deve ter no mínimo 8 caracteres." in error_msg

def test_register_user_invalid_email():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "pytest_email",
            "password": "strongpassword123",
            "tax_id": "12345678901234",
            "full_name": "Invalid Email User",
            "email": "not-an-email" # Invalid email
        }
    )
    # Pydantic validation error should return 422
    assert response.status_code == 422
    error_msg = response.json()["detail"][0]["msg"]
    assert "Value error, Formato de e-mail inválido." in error_msg

def test_login_and_get_profile():
    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "username": "pytest_user",
            "password": "strongpassword123"
        }
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token is not None

    # Get profile
    profile_response = client.get(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["username"] == "pytest_user"
<<<<<<< HEAD


def test_login_with_email_identifier():
    response = client.post(
        "/api/auth/login",
        json={
            "username": "pytest@example.com",
=======
    assert profile_response.json()["notifications_enabled"] is True


def test_update_profile_notification_setting():
    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "username": "pytest_user",
>>>>>>> origin/main
            "password": "strongpassword123"
        }
    )
    assert response.status_code == 200
<<<<<<< HEAD
    assert response.json()["access_token"]
=======
    token = response.json()["access_token"]

    # Toggle off notifications
    patch_response = client.patch(
        "/api/auth/profile",
        json={"notifications_enabled": False},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["notifications_enabled"] is False

    # Get profile to verify
    profile_response = client.get(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["notifications_enabled"] is False

    # Toggle back on
    patch_response_on = client.patch(
        "/api/auth/profile",
        json={"notifications_enabled": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert patch_response_on.status_code == 200
    assert patch_response_on.json()["notifications_enabled"] is True
>>>>>>> origin/main

