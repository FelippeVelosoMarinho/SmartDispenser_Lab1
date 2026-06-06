"""Tests for GET/PUT /api/dispensers/{hardware_id}/period-schedule."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import Dispenser, Patient, Schedule, User

client = TestClient(app)


class MockUser:
    def __init__(self, username):
        self.username = username


@pytest.fixture(autouse=True)
def seed_db():
    db = SessionLocal()
    db.query(Schedule).delete()
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
        hardware_id="disp_period",
        patient_id=patient.id,
        ip_address="192.168.1.50",
    )
    db.add(dispenser)
    db.commit()
    patient_id = str(patient.id)
    db.close()
    yield {"patient_id": patient_id}
    db = SessionLocal()
    db.query(Schedule).delete()
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


def test_get_period_schedule_defaults(mock_user, seed_db):
    resp = client.get("/api/dispensers/disp_period/period-schedule")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "defaults"
    assert data["morning_time"] == "21:00"
    assert data["afternoon_time"] == "21:01"
    assert data["night_time"] == "21:02"


def test_put_period_schedule_upsert(mock_user, seed_db):
    payload = {
        "patient_id": seed_db["patient_id"],
        "morning_time": "08:00",
        "afternoon_time": "14:00",
        "night_time": "20:00",
        "is_active": True,
    }
    resp = client.put("/api/dispensers/disp_period/period-schedule", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "database"
    assert data["morning_time"] == "08:00"
    assert data["afternoon_time"] == "14:00"
    assert data["night_time"] == "20:00"

    db = SessionLocal()
    rows = (
        db.query(Schedule)
        .filter(Schedule.dispenser_id == "disp_period")
        .filter(Schedule.period.isnot(None))
        .all()
    )
    db.close()
    assert len(rows) == 3
    periods = {r.period for r in rows}
    assert periods == {"morning", "afternoon", "night"}

    # Update in place
    payload["morning_time"] = "07:30"
    resp2 = client.put("/api/dispensers/disp_period/period-schedule", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["morning_time"] == "07:30"

    db = SessionLocal()
    count = (
        db.query(Schedule)
        .filter(Schedule.dispenser_id == "disp_period")
        .filter(Schedule.period.isnot(None))
        .count()
    )
    db.close()
    assert count == 3
