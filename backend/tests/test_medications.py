import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.medication import MEDICATIONS, clear_medications
from app.crud.user import create_user, USERS

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    USERS.clear()
    clear_medications()
    create_user("testuser", "hashed_password", "Test User", "test@example.com")
    yield
    USERS.clear()
    clear_medications()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_create_medication(mock_get_current_user):
    payload = {
        "name": "Ibuprofen",
        "description": "Pain reliever",
        "dosage": "400mg"
    }
    response = client.post("/api/medications", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Ibuprofen"
    assert data["description"] == "Pain reliever"
    assert data["dosage"] == "400mg"
    assert "id" in data


def test_list_medications(mock_get_current_user):
    # Create medications
    client.post("/api/medications", json={"name": "Paracetamol"})
    client.post("/api/medications", json={"name": "Amoxicillin"})

    response = client.get("/api/medications")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [m["name"] for m in data]
    assert "Paracetamol" in names
    assert "Amoxicillin" in names


def test_search_medications(mock_get_current_user):
    # Create medications
    client.post("/api/medications", json={"name": "Paracetamol 500mg"})
    client.post("/api/medications", json={"name": "Amoxicillin 250mg"})
    client.post("/api/medications", json={"name": "Paracetamol 1000mg"})

    # Search for "paracetamol" (case-insensitive)
    response = client.get("/api/medications?search=para")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [m["name"] for m in data]
    assert "Paracetamol 500mg" in names
    assert "Paracetamol 1000mg" in names

    # Search for something that doesn't exist
    response = client.get("/api/medications?search=aspirin")
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_unauthorized_access():
    # Attempting to access endpoints without authentication
    # Because we don't have mock_get_current_user here
    
    response = client.get("/api/medications")
    assert response.status_code == 401
    
    response = client.post("/api/medications", json={"name": "Test"})
    assert response.status_code == 401
