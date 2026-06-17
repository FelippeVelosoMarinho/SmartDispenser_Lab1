import pytest
import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import User, Dispenser, Patient, Drawer, Slot, PendingCommand, DispensationLog

client = TestClient(app)

class MockUser:
    def __init__(self, username):
        self.username = username

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(PendingCommand).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    
    db_user = User(username="testuser", hashed_password="hashed_password", tax_id="12345678901234", full_name="Test User", email="test@example.com")
    db.add(db_user)
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(PendingCommand).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    db.close()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: MockUser(username="testuser")
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_get_dispenser_status_mock(mock_get_current_user):
    # It should return a default mock for unknown dispensers or create it
    resp = client.get("/api/dispensers/disp_new/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_new"
    assert data["online"] is False


def test_get_dispenser_status_updated(mock_get_current_user):
    # Mock heartbeat
    payload = {
        "dispenser_id": "disp_known",
        "online": False,
        "critical_stock": True
    }
    client.post("/api/heartbeat", json=payload)

    resp = client.get("/api/dispensers/disp_known/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_known"
    assert data["online"] is False
    assert data["critical_stock"] is True


def test_stale_dispenser_clears_ip_address(mock_get_current_user):
    db = SessionLocal()
    stale = Dispenser(
        hardware_id="disp_stale",
        is_online=True,
        ip_address="192.168.0.12",
        last_sync=datetime.datetime.utcnow() - datetime.timedelta(minutes=5),
    )
    db.add(stale)
    db.commit()
    db.close()

    resp = client.get("/api/dispensers/disp_stale/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["online"] is False
    assert data["ip_address"] is None

    db = SessionLocal()
    refreshed = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_stale").first()
    assert refreshed.ip_address is None
    db.close()


def test_offline_dispenser_with_stale_ip_clears_ip_address(mock_get_current_user):
    db = SessionLocal()
    stale = Dispenser(
        hardware_id="disp_offline_stale",
        is_online=False,
        ip_address="192.168.0.12",
        last_sync=datetime.datetime.utcnow() - datetime.timedelta(minutes=5),
    )
    db.add(stale)
    db.commit()
    db.close()

    resp = client.get("/api/dispensers/disp_offline_stale/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["online"] is False
    assert data["ip_address"] is None

    db = SessionLocal()
    refreshed = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_offline_stale").first()
    assert refreshed.ip_address is None
    db.close()


def test_delete_dispenser_with_mac_and_drawers(mock_get_current_user):
    hardware_id = "8C:D0:B2:A9:17:4B"
    db = SessionLocal()
    patient = Patient(full_name="Paciente Teste", caregiver_username="testuser")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    dispenser = Dispenser(hardware_id=hardware_id, patient_id=patient.id)
    db.add(dispenser)
    db.commit()
    db.refresh(dispenser)

    drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
    db.add(drawer)
    db.commit()
    db.refresh(drawer)

    db.add(Slot(drawer_id=drawer.id, position_number=1, max_pill_capacity=30))
    db.commit()
    dispenser_pk = dispenser.id
    db.close()

    resp = client.delete(f"/api/dispensers/{hardware_id}")
    assert resp.status_code == 204

    db = SessionLocal()
    assert db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first() is None
    assert db.query(Drawer).filter(Drawer.dispenser_id == dispenser_pk).count() == 0
    db.close()


def test_delete_dispenser_blocked_when_configured(mock_get_current_user):
    from app.models.domain import SlotMedication, Medication, Schedule

    hardware_id = "AA:BB:CC:DD:EE:FF"
    db = SessionLocal()
    patient = Patient(full_name="Paciente Teste", caregiver_username="testuser")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    dispenser = Dispenser(hardware_id=hardware_id, patient_id=patient.id)
    db.add(dispenser)
    db.commit()
    db.refresh(dispenser)

    drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
    db.add(drawer)
    db.commit()
    db.refresh(drawer)

    slot = Slot(drawer_id=drawer.id, position_number=1, max_pill_capacity=30)
    db.add(slot)
    db.commit()
    db.refresh(slot)

    med = Medication(name="Aspirina", dosage="100mg")
    db.add(med)
    db.commit()
    db.refresh(med)

    db.add(SlotMedication(slot_id=slot.id, medication_id=med.id, quantity=5))
    db.add(Schedule(slot_id=slot.id, dispenser_id=hardware_id, is_active=True))
    db.commit()
    db.close()

    status_resp = client.get(f"/api/dispensers/{hardware_id}/deletion-status")
    assert status_resp.status_code == 200
    status = status_resp.json()
    assert status["can_delete"] is False
    assert status["blockers"]["medications_in_slots"] == 1

    del_resp = client.delete(f"/api/dispensers/{hardware_id}")
    assert del_resp.status_code == 409
    detail = del_resp.json()["detail"]
    assert detail["code"] == "DISPENSER_HAS_CONFIGURATION"
    assert len(detail["steps"]) > 0

    reset_resp = client.post(f"/api/dispensers/{hardware_id}/reset-configuration")
    assert reset_resp.status_code == 200

    del_resp2 = client.delete(f"/api/dispensers/{hardware_id}")
    assert del_resp2.status_code == 204


def test_reset_demo_clears_logs_and_supersedes_active_commands(mock_get_current_user):
    hardware_id = "AA:BB:CC:DD:EE:11"
    db = SessionLocal()
    patient = Patient(full_name="Paciente Teste", caregiver_username="testuser")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    dispenser = Dispenser(hardware_id=hardware_id, patient_id=patient.id, awaiting_confirm=True)
    db.add(dispenser)
    db.commit()
    db.add(
        DispensationLog(
            dispenser_id_legacy=hardware_id,
            actual_execution_time=datetime.datetime.utcnow(),
            success=True,
        )
    )
    command = PendingCommand(hardware_id=hardware_id, command_type="demo", status="pending")
    db.add(command)
    db.commit()
    command_id = command.id
    db.close()

    resp = client.post(f"/api/dispensers/{hardware_id}/reset-demo")
    assert resp.status_code == 200

    db = SessionLocal()
    assert db.query(DispensationLog).filter(DispensationLog.dispenser_id_legacy == hardware_id).count() == 0
    refreshed_command = db.query(PendingCommand).filter(PendingCommand.id == command_id).first()
    assert refreshed_command.status == "superseded"
    refreshed_dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    assert refreshed_dispenser.awaiting_confirm is False
    db.close()
