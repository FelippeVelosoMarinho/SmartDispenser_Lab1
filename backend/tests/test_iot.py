import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.schedule import create_schedule
from app.crud.log import get_dispensation_logs
from app.crud.dispenser import get_dispenser_status
from app.core.database import SessionLocal
from app.models.domain import Dispenser, Schedule, Patient, User, DispensationLog

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(Schedule).delete()
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    
    yield
    
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(Schedule).delete()
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    db.close()

def test_sync_dispenser():
    db = SessionLocal()
    # Create patient for schedule
    user = User(username="testuser", hashed_password="pwd", full_name="User")
    db.add(user)
    db.commit()
    patient = Patient(caregiver_username="testuser", full_name="Pat", name="Pat")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    create_schedule(db, {
        "patient_id": str(patient.id),
        "dispenser_id": "disp_iot",
        "medication_id": "1",
        "slot_id": 1,
        "time": "08:00",
        "quantity": 2
    })
    db.close()
    
    resp = client.get("/api/sync/disp_iot")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_iot"
    assert len(data["schedules"]) == 1
    assert data["schedules"][0]["slot_id"] == 1
    assert data["schedules"][0]["time"] == "08:00"

def test_process_iot_event():
    payload = {
        "dispenser_id": "disp_iot",
        "event_type": "dispensed",
        "success": True
    }
    resp = client.post("/api/event", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "log_id" in data
    assert "message" in data
    
    db = SessionLocal()
    logs = get_dispensation_logs(db, dispenser_id="disp_iot")
    db.close()
    assert len(logs) == 1
    assert logs[0].success is True

def test_process_heartbeat():
    payload = {
        "dispenser_id": "disp_iot",
        "battery_level": 99.5,
        "online": True,
        "critical_stock": False
    }
    resp = client.post("/api/heartbeat", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Heartbeat recorded successfully."
    
    db = SessionLocal()
    status = get_dispenser_status(db, "disp_iot")
    db.close()
    
    assert status["battery_level"] == 99.5
    assert status["online"] is True
