import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import User, Patient, Schedule, Dispenser, Drawer, Slot, Medication

client = TestClient(app)


class MockUser:
    def __init__(self, username):
        self.username = username


@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(Schedule).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Medication).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()

    db_user = User(
        username="testuser",
        hashed_password="hashed_password",
        tax_id="12345678901234",
        full_name="Test User",
        email="test@example.com",
    )
    db.add(db_user)
    db.commit()
    db.close()

    yield

    db = SessionLocal()
    db.query(Schedule).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Medication).delete()
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


def create_db_patient(username: str, name: str) -> str:
    db = SessionLocal()
    user = db.query(User).filter(User.username == username).first()
    if not user:
        tax_id = f"123456789{len(username):05d}"
        user = User(username=username, hashed_password="pwd", tax_id=tax_id, full_name="User")
        db.add(user)
        db.commit()

    patient = Patient(caregiver_username=username, full_name=name, name=name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    pid = str(patient.id)
    db.close()
    return pid


def create_schedule_dependencies(
    slot_id: int = 1,
    position_number: int = 1,
    hardware_id: str = "disp_1",
) -> str:
    """Create dispenser + slot; returns dispenser UUID string."""
    db = SessionLocal()
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    if not dispenser:
        dispenser = Dispenser(hardware_id=hardware_id)
        db.add(dispenser)
        db.flush()
        drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
        db.add(drawer)
        db.flush()
    else:
        drawer = db.query(Drawer).filter(Drawer.dispenser_id == dispenser.id).first()
        if not drawer:
            drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
            db.add(drawer)
            db.flush()

    if not db.query(Slot).filter(Slot.id == slot_id).first():
        slot = Slot(
            id=slot_id,
            drawer_id=drawer.id,
            position_number=position_number,
            max_pill_capacity=10,
        )
        db.add(slot)
    db.commit()
    dispenser_uuid = str(dispenser.id)
    db.close()
    return dispenser_uuid


def test_create_schedule(mock_get_current_user):
    pid = create_db_patient("testuser", "John Doe")
    create_schedule_dependencies()

    payload = {
        "patient_id": pid,
        "dispenser_id": "disp_1",
        "slot_id": 1,
        "time": "2026-06-10T08:00",
        "is_active": True,
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "2026-06-10T08:00" in data["time"]
    assert data["is_active"] is True
    assert data["dispenser_id"] == "disp_1"
    assert "id" in data


def test_create_schedule_resolves_dispenser_uuid(mock_get_current_user):
    pid = create_db_patient("testuser", "John Doe")
    dispenser_uuid = create_schedule_dependencies()

    payload = {
        "patient_id": pid,
        "dispenser_id": dispenser_uuid,
        "slot_id": 1,
        "time": "08:00",
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 201
    assert response.json()["dispenser_id"] == "disp_1"


def test_create_schedule_rejects_invalid_position(mock_get_current_user):
    pid = create_db_patient("testuser", "John Doe")
    create_schedule_dependencies(slot_id=2, position_number=25)

    payload = {
        "patient_id": pid,
        "dispenser_id": "disp_1",
        "slot_id": 2,
        "time": "08:00",
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 400


def test_patch_schedule_is_active(mock_get_current_user):
    pid = create_db_patient("testuser", "Jane Doe")
    create_schedule_dependencies()

    create_resp = client.post(
        "/api/schedules",
        json={
            "patient_id": pid,
            "dispenser_id": "disp_1",
            "slot_id": 1,
            "time": "10:00",
        },
    )
    schedule_id = create_resp.json()["id"]

    patch_resp = client.patch(
        f"/api/schedules/{schedule_id}",
        json={"is_active": False},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["is_active"] is False


def test_list_schedules(mock_get_current_user):
    pid1 = create_db_patient("testuser", "Patient 1")
    pid2 = create_db_patient("testuser", "Patient 2")
    create_schedule_dependencies()
    create_schedule_dependencies(slot_id=2, position_number=2, hardware_id="disp_2")

    client.post(
        "/api/schedules",
        json={
            "patient_id": pid1,
            "dispenser_id": "disp_1",
            "slot_id": 1,
            "time": "08:00",
        },
    )

    client.post(
        "/api/schedules",
        json={
            "patient_id": pid2,
            "dispenser_id": "disp_2",
            "slot_id": 2,
            "time": "12:00",
        },
    )

    response = client.get("/api/schedules")
    assert response.status_code == 200
    assert len(response.json()) == 2

    response = client.get(f"/api/schedules?patient_id={pid1}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["patient_id"] == pid1

    response = client.get("/api/schedules?dispenser_id=disp_2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["dispenser_id"] == "disp_2"


def test_delete_schedule(mock_get_current_user):
    pid = create_db_patient("testuser", "Jane Doe")
    create_schedule_dependencies()

    create_resp = client.post(
        "/api/schedules",
        json={
            "patient_id": pid,
            "dispenser_id": "disp_1",
            "slot_id": 1,
            "time": "10:00",
        },
    )
    schedule_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/schedules/{schedule_id}")
    assert del_resp.status_code == 204

    list_resp = client.get(f"/api/schedules?patient_id={pid}")
    assert len(list_resp.json()) == 0


def test_unauthorized_access():
    response = client.get("/api/schedules")
    assert response.status_code == 401


def test_unauthorized_patient_access():
    from app.core.security import get_current_user

    pid = create_db_patient("otheruser", "Other Patient")
    create_schedule_dependencies()

    app.dependency_overrides[get_current_user] = lambda: MockUser(username="testuser")

    payload = {
        "patient_id": pid,
        "dispenser_id": "disp_1",
        "slot_id": 1,
        "time": "08:00",
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 403

    response = client.get(f"/api/schedules?patient_id={pid}")
    assert response.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)
