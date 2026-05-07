import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.log import create_dispensation_log, create_refill_log, clear_logs
from app.crud.user import create_user, USERS

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    USERS.clear()
    clear_logs()
    create_user("testuser", "hashed_password", "Test User", "test@example.com")
    yield
    USERS.clear()
    clear_logs()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"username": "testuser"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_list_dispensation_logs(mock_get_current_user):
    create_dispensation_log({
        "schedule_id": "sch_1",
        "patient_id": "pat_1",
        "dispenser_id": "disp_1",
        "medication_id": "med_1",
        "success": True,
    })
    create_dispensation_log({
        "schedule_id": "sch_2",
        "patient_id": "pat_2",
        "dispenser_id": "disp_2",
        "medication_id": "med_2",
        "success": False,
        "error_message": "Slot empty"
    })

    # Get all logs
    resp = client.get("/api/logs/dispensation")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2

    # Filter by patient
    resp = client.get("/api/logs/dispensation?patient_id=pat_1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["patient_id"] == "pat_1"
    assert data[0]["success"] is True

    # Filter by dispenser
    resp = client.get("/api/logs/dispensation?dispenser_id=disp_2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["dispenser_id"] == "disp_2"
    assert data[0]["success"] is False


def test_list_refill_logs(mock_get_current_user):
    create_refill_log({
        "dispenser_id": "disp_1",
        "slot_id": 1,
        "medication_id": "med_1",
        "quantity_added": 10,
        "performed_by": "testuser"
    })
    
    resp = client.get("/api/logs/refill")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["dispenser_id"] == "disp_1"
    assert data[0]["quantity_added"] == 10
