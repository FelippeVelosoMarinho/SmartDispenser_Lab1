import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.dispenser import update_dispenser_status, clear_dispenser_status
from app.crud.user import create_user, USERS

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    USERS.clear()
    clear_dispenser_status()
    create_user("testuser", "hashed_password", "Test User", "test@example.com")
    yield
    USERS.clear()
    clear_dispenser_status()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_get_dispenser_status_mock(mock_get_current_user):
    # It should return a default mock for unknown dispensers
    resp = client.get("/api/dispensers/disp_new/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_new"
    assert data["online"] is True


def test_get_dispenser_status_updated(mock_get_current_user):
    update_dispenser_status("disp_known", {
        "dispenser_id": "disp_known",
        "battery_level": 15.0,
        "online": False,
        "critical_stock": True
    })

    resp = client.get("/api/dispensers/disp_known/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_known"
    assert data["battery_level"] == 15.0
    assert data["online"] is False
    assert data["critical_stock"] is True
