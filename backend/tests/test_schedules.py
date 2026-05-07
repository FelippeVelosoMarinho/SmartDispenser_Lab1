import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.user import create_user, USERS
from app.crud.patient import create_patient, PATIENTS, clear_patients
from app.crud.schedule import SCHEDULES, clear_schedules

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    USERS.clear()
    clear_patients()
    clear_schedules()
    create_user("testuser", "hashed_password", "Test User", "test@example.com")
    yield
    USERS.clear()
    clear_patients()
    clear_schedules()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_create_schedule(mock_get_current_user):
    # Setup patient
    patient = create_patient("testuser", {"name": "John Doe"})
    
    payload = {
        "patient_id": patient["id"],
        "dispenser_id": "disp_1",
        "medication_id": "med_1",
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
    patient1 = create_patient("testuser", {"name": "Patient 1"})
    patient2 = create_patient("testuser", {"name": "Patient 2"})

    # Create schedules for patient 1
    client.post("/api/schedules", json={
        "patient_id": patient1["id"],
        "dispenser_id": "disp_1",
        "medication_id": "med_1",
        "slot_id": 1,
        "time": "08:00",
        "quantity": 1
    })

    # Create schedules for patient 2
    client.post("/api/schedules", json={
        "patient_id": patient2["id"],
        "dispenser_id": "disp_2",
        "medication_id": "med_2",
        "slot_id": 2,
        "time": "12:00",
        "quantity": 1
    })

    # List all schedules (for current user's patients)
    response = client.get("/api/schedules")
    assert response.status_code == 200
    assert len(response.json()) == 2

    # List schedules for patient 1 only
    response = client.get(f"/api/schedules?patient_id={patient1['id']}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["patient_id"] == patient1["id"]

    # Filter by dispenser
    response = client.get("/api/schedules?dispenser_id=disp_2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["dispenser_id"] == "disp_2"


def test_delete_schedule(mock_get_current_user):
    patient = create_patient("testuser", {"name": "Jane Doe"})
    
    # Create schedule
    create_resp = client.post("/api/schedules", json={
        "patient_id": patient["id"],
        "dispenser_id": "disp_1",
        "medication_id": "med_1",
        "slot_id": 1,
        "time": "10:00",
        "quantity": 1
    })
    schedule_id = create_resp.json()["id"]

    # Delete schedule
    del_resp = client.delete(f"/api/schedules/{schedule_id}")
    assert del_resp.status_code == 204

    # Verify it's gone
    list_resp = client.get(f"/api/schedules?patient_id={patient['id']}")
    assert len(list_resp.json()) == 0


def test_unauthorized_access():
    # Attempting to access endpoints without authentication
    response = client.get("/api/schedules")
    assert response.status_code == 401

def test_unauthorized_patient_access():
    from app.core.security import get_current_user
    
    # Setup patient for otheruser
    create_user("otheruser", "pwd", "Other User")
    patient = create_patient("otheruser", {"name": "Other Patient"})
    
    # Run as testuser
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}

    # Try to create schedule for otheruser's patient
    payload = {
        "patient_id": patient["id"],
        "dispenser_id": "disp_1",
        "medication_id": "med_1",
        "slot_id": 1,
        "time": "08:00",
        "quantity": 1
    }
    response = client.post("/api/schedules", json=payload)
    assert response.status_code == 403

    # Try to list otheruser's patient schedules
    response = client.get(f"/api/schedules?patient_id={patient['id']}")
    assert response.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)
