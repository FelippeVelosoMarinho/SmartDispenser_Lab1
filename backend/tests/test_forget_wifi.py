"""Tests for POST /api/dispensers/{hardware_id}/forget-wifi."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import Dispenser, Patient, User

client = TestClient(app)


class MockUser:
    def __init__(self, username):
        self.username = username


@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    user = User(
        username="testuser",
        hashed_password="pwd",
        tax_id="12345678901234",
        full_name="Test User",
    )
    db.add(user)
    patient = Patient(caregiver_username="testuser", full_name="Paciente", name="Paciente")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    dispenser = Dispenser(
        hardware_id="disp_wifi",
        patient_id=patient.id,
        ip_address="192.168.1.50",
        is_online=True,
    )
    db.add(dispenser)
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    db.close()


@pytest.fixture
def mock_user():
    from app.core.security import get_current_user

    app.dependency_overrides[get_current_user] = lambda: MockUser("testuser")
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_forget_wifi_no_ip(mock_user):
    db = SessionLocal()
    d = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_wifi").first()
    d.ip_address = None
    db.commit()
    db.close()

    resp = client.post("/api/dispensers/disp_wifi/forget-wifi")
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "DISPENSER_UNREACHABLE"


def test_forget_wifi_success(mock_user):
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        resp = client.post("/api/dispensers/disp_wifi/forget-wifi")

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["hardware_id"] == "disp_wifi"
