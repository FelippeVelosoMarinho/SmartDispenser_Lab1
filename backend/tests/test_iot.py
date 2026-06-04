import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.schedule import create_schedule
from app.crud.log import get_dispensation_logs
from app.crud.dispenser import get_dispenser_status
from app.core.database import SessionLocal
from app.models.domain import Dispenser, Schedule, Patient, User, DispensationLog, Drawer, Slot, Medication

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(Schedule).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Medication).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    
    yield
    
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(Schedule).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Medication).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    db.close()


def create_schedule_dependencies() -> None:
    db = SessionLocal()
    if not db.query(Medication).filter(Medication.id == 1).first():
        db.add(Medication(id=1, name="Med 1"))
    if not db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first():
        dispenser = Dispenser(hardware_id="disp_iot")
        db.add(dispenser)
        db.flush()
        drawer = Drawer(id=1, dispenser_id=dispenser.id, label="Drawer 1")
        db.add(drawer)
        db.flush()
        db.add(
            Slot(
                id=1,
                drawer_id=drawer.id,
                medication_id=1,
                position_number=1,
                max_pill_capacity=10,
                current_pill_count=0,
            )
        )
    elif not db.query(Slot).filter(Slot.id == 1).first():
        drawer = db.query(Drawer).filter(Drawer.id == 1).first()
        if not drawer:
            dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first()
            drawer = Drawer(id=1, dispenser_id=dispenser.id, label="Drawer 1")
            db.add(drawer)
            db.flush()
        db.add(
            Slot(
                id=1,
                drawer_id=drawer.id,
                medication_id=1,
                position_number=1,
                max_pill_capacity=10,
                current_pill_count=0,
            )
        )
    db.commit()
    db.close()

def test_sync_dispenser():
    create_schedule_dependencies()
    db = SessionLocal()
    # Create patient for schedule
    user = User(username="testuser", hashed_password="pwd", tax_id="12345678901234", full_name="User")
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
    
    assert status["online"] is True
