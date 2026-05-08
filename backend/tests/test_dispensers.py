import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.domain import User, Dispenser

client = TestClient(app)

class MockUser:
    def __init__(self, username):
        self.username = username

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(Dispenser).delete()
    db.query(User).delete()
    db.commit()
    
    db_user = User(username="testuser", hashed_password="hashed_password", full_name="Test User", email="test@example.com")
    db.add(db_user)
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(Dispenser).delete()
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
    assert data["online"] is True


def test_get_dispenser_status_updated(mock_get_current_user):
    # Mock heartbeat
    payload = {
        "dispenser_id": "disp_known",
        "battery_level": 15.0,
        "online": False,
        "critical_stock": True
    }
    client.post("/api/heartbeat", json=payload)

    resp = client.get("/api/dispensers/disp_known/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_known"
    assert data["battery_level"] == 15.0
    assert data["online"] is False
    assert data["critical_stock"] is True
