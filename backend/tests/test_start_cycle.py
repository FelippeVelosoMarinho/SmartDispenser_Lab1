"""Tests for POST /api/dispensers/{hardware_id}/start-cycle and hardware-status."""

from unittest.mock import AsyncMock, patch

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
def seed_db():
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
        hardware_id="8C:D0:B2:A9:17:4B",
        patient_id=patient.id,
        ip_address="10.0.0.16",
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


def test_start_cycle_no_ip(mock_user):
    db = SessionLocal()
    d = db.query(Dispenser).filter(Dispenser.hardware_id == "8C:D0:B2:A9:17:4B").first()
    d.ip_address = None
    db.commit()
    db.close()

    resp = client.post("/api/dispensers/8C:D0:B2:A9:17:4B/start-cycle")
    assert resp.status_code == 503


def test_start_cycle_success(mock_user):
    status_before = {"current_slot": 2, "awaiting_confirm": True, "total_slots": 21}
    status_after = {"current_slot": 0, "awaiting_confirm": False, "total_slots": 21}

    with patch(
        "app.api.endpoints.dispensers.get_hardware_status",
        new_callable=AsyncMock,
        side_effect=[status_before, status_after],
    ):
        with patch(
            "app.api.endpoints.dispensers.post_confirm",
            new_callable=AsyncMock,
            return_value=True,
        ):
            with patch(
                "app.api.endpoints.dispensers.post_calibrate",
                new_callable=AsyncMock,
                return_value=(True, {}),
            ):
                resp = client.post("/api/dispensers/8C:D0:B2:A9:17:4B/start-cycle")

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["current_slot"] == 0


def test_hardware_status_success(mock_user):
    with patch(
        "app.api.endpoints.dispensers.get_hardware_status",
        new_callable=AsyncMock,
        return_value={
            "current_slot": 3,
            "total_slots": 21,
            "awaiting_confirm": False,
            "last_confirmed_slot": 2,
        },
    ):
        resp = client.get("/api/dispensers/8C:D0:B2:A9:17:4B/hardware-status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["current_slot"] == 3
    assert data["awaiting_confirm"] is False
