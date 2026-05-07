import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.schedule import create_schedule, clear_schedules
from app.crud.log import get_dispensation_logs, clear_logs
from app.crud.dispenser import get_dispenser_status, clear_dispenser_status

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    clear_schedules()
    clear_logs()
    clear_dispenser_status()
    yield
    clear_schedules()
    clear_logs()
    clear_dispenser_status()

def test_sync_dispenser():
    create_schedule({
        "patient_id": "p1",
        "dispenser_id": "disp_iot",
        "medication_id": "med1",
        "slot_id": 1,
        "time": "08:00",
        "quantity": 2
    })
    
    resp = client.get("/api/sync/disp_iot")
    assert resp.status_code == 200
    data = resp.json()
    assert data["dispenser_id"] == "disp_iot"
    assert len(data["schedules"]) == 1
    assert data["schedules"][0]["slot_id"] == 1
    assert data["schedules"][0]["time"] == "08:00"

def test_process_iot_event():
    payload = {
        "dispenser_id": "disp_iot",
        "event_type": "dispensed",
        "success": True
    }
    resp = client.post("/api/event", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "log_id" in data
    assert "message" in data
    
    logs = get_dispensation_logs(dispenser_id="disp_iot")
    assert len(logs) == 1
    assert logs[0]["success"] is True

def test_process_heartbeat():
    payload = {
        "dispenser_id": "disp_iot",
        "battery_level": 99.5,
        "online": True,
        "critical_stock": False
    }
    resp = client.post("/api/heartbeat", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Heartbeat recorded successfully."
    
    status = get_dispenser_status("disp_iot")
    assert status["battery_level"] == 99.5
    assert status["online"] is True
