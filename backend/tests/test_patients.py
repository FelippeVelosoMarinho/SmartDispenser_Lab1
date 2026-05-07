import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.user import create_user, USERS
from app.crud.patient import PATIENTS, clear_patients

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    USERS.clear()
    clear_patients()
    create_user("testuser", "hashed_password", "Test User", "test@example.com")
    yield
    USERS.clear()
    clear_patients()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_create_patient(mock_get_current_user):
    payload = {
        "name": "John Doe",
        "age": 70,
        "condition": "Hypertension",
        "dispensers": ["dispenser_1"]
    }
    response = client.post("/api/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["age"] == 70
    assert "id" in data
    assert data["caregiver_username"] == "testuser"
    assert data["dispensers"] == ["dispenser_1"]


def test_list_patients(mock_get_current_user):
    # Create patient 1
    client.post("/api/patients", json={"name": "Patient 1"})
    # Create patient 2
    client.post("/api/patients", json={"name": "Patient 2"})

    response = client.get("/api/patients")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Patient 1"
    assert data[1]["name"] == "Patient 2"


def test_get_patient_details(mock_get_current_user):
    create_resp = client.post("/api/patients", json={"name": "Jane Doe"})
    patient_id = create_resp.json()["id"]

    response = client.get(f"/api/patients/{patient_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == patient_id
    assert data["name"] == "Jane Doe"


def test_get_patient_not_found(mock_get_current_user):
    response = client.get("/api/patients/nonexistent_id")
    assert response.status_code == 404


def test_update_patient(mock_get_current_user):
    create_resp = client.post("/api/patients", json={"name": "Old Name", "age": 60})
    patient_id = create_resp.json()["id"]

    update_payload = {"name": "New Name", "dispensers": ["disp_1", "disp_2"]}
    response = client.patch(f"/api/patients/{patient_id}", json=update_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["age"] == 60  # Should remain unchanged
    assert data["dispensers"] == ["disp_1", "disp_2"]


def test_unauthorized_access():
    # Setup testuser and otheruser and their dependencies
    from app.core.security import get_current_user
    
    app.dependency_overrides[get_current_user] = lambda: {"username": "otheruser"}
    create_resp = client.post("/api/patients", json={"name": "Other Patient"})
    patient_id = create_resp.json()["id"]

    # Now override dependency back to testuser
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}

    # Try to access otheruser's patient
    response = client.get(f"/api/patients/{patient_id}")
    assert response.status_code == 403
    
    # Try to update otheruser's patient
    response = client.patch(f"/api/patients/{patient_id}", json={"name": "Hacked"})
    assert response.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)
