import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import User, Patient, Dispenser

client = TestClient(app)

class MockUser:
    def __init__(self, username):
        self.username = username

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    # Clean up before tests
    db.query(Dispenser).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    
    # Create test user
    db_user = User(username="testuser", hashed_password="hashed_password", tax_id="12345678901234", full_name="Test User", email="test@example.com")
    db.add(db_user)
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
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: MockUser(username="testuser")
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_create_patient(mock_get_current_user):
    payload = {
        "name": "John Doe",
        "age": 70,
        "condition": "Hypertension",
        "dispensers": [] # Note: Dispensers relation update logic might not be implemented in CRUD yet
    }
    response = client.post("/api/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["age"] == 70
    assert "id" in data
    assert data["caregiver_username"] == "testuser"


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
    # Valid UUID to avoid DB syntax error
    response = client.get("/api/patients/123e4567-e89b-12d3-a456-426614174000")
    assert response.status_code == 404


def test_update_patient(mock_get_current_user):
    create_resp = client.post("/api/patients", json={"name": "Old Name", "age": 60})
    patient_id = create_resp.json()["id"]

    update_payload = {"name": "New Name"}
    response = client.patch(f"/api/patients/{patient_id}", json=update_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["age"] == 60  # Should remain unchanged


def test_unauthorized_access():
    # Setup testuser and otheruser and their dependencies
    from app.core.security import get_current_user
    
    app.dependency_overrides[get_current_user] = lambda: MockUser(username="otheruser")
    create_resp = client.post("/api/patients", json={"name": "Other Patient"})
    patient_id = create_resp.json()["id"]

    # Now override dependency back to testuser
    app.dependency_overrides[get_current_user] = lambda: MockUser(username="testuser")

    # Try to access otheruser's patient
    response = client.get(f"/api/patients/{patient_id}")
    assert response.status_code == 403
    
    # Try to update otheruser's patient
    response = client.patch(f"/api/patients/{patient_id}", json={"name": "Hacked"})
    assert response.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)
