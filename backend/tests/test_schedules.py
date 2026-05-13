import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import User, Patient, Schedule

client = TestClient(app)

class MockUser:
    def __init__(self, username):
        self.username = username

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(Schedule).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    
    db_user = User(username="testuser", hashed_password="hashed_password", full_name="Test User", email="test@example.com")
    db.add(db_user)
    db.commit()
    db.close()
    
    yield
    
    db = SessionLocal()
    db.query(Schedule).delete()
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
    # ensure user exists
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username, hashed_password="pwd", full_name="User")
        db.add(user)
        db.commit()
    
    patient = Patient(caregiver_username=username, full_name=name, name=name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    pid = str(patient.id)
    db.close()
    return pid


def test_create_schedule(mock_get_current_user):
    pid = create_db_patient("testuser", "John Doe")
    
    payload = {
        "patient_id": pid,
        "dispenser_id": "disp_1",
        "medication_id": "1", # integer compatible string
        "slot_id": 1,
        "time": "08:00",
        "quantity": 2
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["time"] == "08:00"
    assert data["quantity"] == 2
    assert "id" in data


def test_list_schedules(mock_get_current_user):
    pid1 = create_db_patient("testuser", "Patient 1")
    pid2 = create_db_patient("testuser", "Patient 2")

    client.post("/api/schedules", json={
        "patient_id": pid1,
        "dispenser_id": "disp_1",
        "medication_id": "1",
        "slot_id": 1,
        "time": "08:00",
        "quantity": 1
    })

    client.post("/api/schedules", json={
        "patient_id": pid2,
        "dispenser_id": "disp_2",
        "medication_id": "2",
        "slot_id": 2,
        "time": "12:00",
        "quantity": 1
    })

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
    
    create_resp = client.post("/api/schedules", json={
        "patient_id": pid,
        "dispenser_id": "disp_1",
        "medication_id": "1",
        "slot_id": 1,
        "time": "10:00",
        "quantity": 1
    })
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
    
    app.dependency_overrides[get_current_user] = lambda: MockUser(username="testuser")

    payload = {
        "patient_id": pid,
        "dispenser_id": "disp_1",
        "medication_id": "1",
        "slot_id": 1,
        "time": "08:00",
        "quantity": 1
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 403

    response = client.get(f"/api/schedules?patient_id={pid}")
    assert response.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)
