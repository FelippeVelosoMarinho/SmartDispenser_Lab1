import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.schedule import create_schedule
from app.crud.log import get_dispensation_logs
from app.crud.dispenser import get_dispenser_status
from app.core.database import SessionLocal
from app.models.domain import (
    Dispenser,
    Schedule,
    Patient,
    User,
    DispensationLog,
    Drawer,
    Slot,
    Medication,
    PendingCommand,
)
from app.crud import command_queue as crud_command_queue

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(PendingCommand).delete()
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
    db.query(PendingCommand).delete()
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
                position_number=1,
                max_pill_capacity=10,
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
                position_number=1,
                max_pill_capacity=10,
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
    assert data.get("command") is None

    db = SessionLocal()
    status = get_dispenser_status(db, "disp_iot")
    db.close()

    assert status["online"] is True


def test_heartbeat_returns_pending_command():
    create_schedule_dependencies()
    db = SessionLocal()
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first()
    schedule = Schedule(
        dispenser_id="disp_iot",
        period="morning",
        is_active=True,
        time_legacy="08:00",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    crud_command_queue.enqueue_dispense(db, "disp_iot", "morning", 1, schedule.id)
    db.close()

    resp = client.post(
        "/api/heartbeat",
        json={
            "dispenser_id": "disp_iot",
            "online": True,
            "current_slot": 0,
            "awaiting_confirm": False,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["command"] is not None
    assert data["command"]["type"] == "dispense"
    assert data["command"]["period"] == "morning"
    assert data["command"]["expected_slot"] == 1


def test_heartbeat_command_ack_persists_telemetry_and_log():
    create_schedule_dependencies()
    db = SessionLocal()
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first()
    schedule = Schedule(
        dispenser_id="disp_iot",
        period="night",
        is_active=True,
        time_legacy="20:00",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    cmd = crud_command_queue.enqueue_dispense(db, "disp_iot", "night", 2, schedule.id)
    crud_command_queue.mark_delivered(db, cmd)
    command_id = str(cmd.id)
    db.close()

    resp = client.post(
        "/api/heartbeat",
        json={
            "dispenser_id": "disp_iot",
            "online": True,
            "current_slot": 2,
            "awaiting_confirm": True,
            "command_ack": {
                "command_id": command_id,
                "success": True,
            },
        },
    )
    assert resp.status_code == 200

    db = SessionLocal()
    refreshed = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first()
    assert refreshed.current_slot == 2
    assert refreshed.awaiting_confirm is True
    acked = db.query(PendingCommand).filter(PendingCommand.id == cmd.id).first()
    assert acked.status == "completed"
    logs = get_dispensation_logs(db, dispenser_id="disp_iot")
    assert len(logs) == 1
    assert logs[0].success is True
    db.close()


def test_heartbeat_ack_updates_current_slot_from_expected_not_stale_payload():
    """ACK success must persist post-dispense slot, not pre-command heartbeat value."""
    create_schedule_dependencies()
    db = SessionLocal()
    schedule = Schedule(
        dispenser_id="disp_iot",
        period="morning",
        is_active=True,
        time_legacy="08:00",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    cmd = crud_command_queue.enqueue_dispense(db, "disp_iot", "morning", 2, schedule.id)
    crud_command_queue.mark_delivered(db, cmd)
    command_id = str(cmd.id)
    db.close()

    resp = client.post(
        "/api/heartbeat",
        json={
            "dispenser_id": "disp_iot",
            "online": True,
            "current_slot": 1,
            "awaiting_confirm": True,
            "command_ack": {
                "command_id": command_id,
                "success": True,
            },
        },
    )
    assert resp.status_code == 200

    db = SessionLocal()
    refreshed = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first()
    assert refreshed.current_slot == 2
    db.close()


def test_heartbeat_ack_calibrate_resets_current_slot():
    create_schedule_dependencies()
    db = SessionLocal()
    cmd = crud_command_queue.enqueue_calibrate(db, "disp_iot")
    crud_command_queue.mark_delivered(db, cmd)
    command_id = str(cmd.id)
    db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").update(
        {"current_slot": 5}
    )
    db.commit()
    db.close()

    resp = client.post(
        "/api/heartbeat",
        json={
            "dispenser_id": "disp_iot",
            "online": True,
            "current_slot": 5,
            "awaiting_confirm": False,
            "command_ack": {
                "command_id": command_id,
                "success": True,
            },
        },
    )
    assert resp.status_code == 200

    db = SessionLocal()
    refreshed = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_iot").first()
    assert refreshed.current_slot == 0
    db.close()
