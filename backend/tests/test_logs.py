import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crud.log import create_dispensation_log, create_refill_log
from app.core.database import SessionLocal
from app.models.domain import User, DispensationLog, RefillHistory, Dispenser, Drawer, Slot, Medication

client = TestClient(app)

class MockUser:
    def __init__(self, username):
        self.username = username

@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(RefillHistory).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Medication).delete()
    db.query(User).delete()
    db.commit()
    
    db_user = User(username="testuser", hashed_password="hashed_password", tax_id="12345678901234", full_name="Test User", email="test@example.com")
    db.add(db_user)
    db.commit()
    db.close()
    
    yield
    
    db = SessionLocal()
    db.query(DispensationLog).delete()
    db.query(RefillHistory).delete()
    db.query(Slot).delete()
    db.query(Drawer).delete()
    db.query(Dispenser).delete()
    db.query(Medication).delete()
    db.query(User).delete()
    db.commit()
    db.close()


def create_refill_dependencies() -> None:
    db = SessionLocal()
    if not db.query(Medication).filter(Medication.id == 1).first():
        db.add(Medication(id=1, name="Med 1"))
    if not db.query(Dispenser).filter(Dispenser.hardware_id == "disp_1").first():
        dispenser = Dispenser(hardware_id="disp_1")
        db.add(dispenser)
        db.flush()
        drawer = Drawer(id=1, dispenser_id=dispenser.id, label="Drawer 1")
        db.add(drawer)
        db.flush()
        db.add(
            Slot(
                id=1,
                drawer_id=drawer.id,
                medication_id=1,
                position_number=1,
                max_pill_capacity=10,
                current_pill_count=0,
            )
        )
    elif not db.query(Slot).filter(Slot.id == 1).first():
        drawer = db.query(Drawer).filter(Drawer.id == 1).first()
        if not drawer:
            dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == "disp_1").first()
            drawer = Drawer(id=1, dispenser_id=dispenser.id, label="Drawer 1")
            db.add(drawer)
            db.flush()
        db.add(
            Slot(
                id=1,
                drawer_id=drawer.id,
                medication_id=1,
                position_number=1,
                max_pill_capacity=10,
                current_pill_count=0,
            )
        )
    db.commit()
    db.close()


@pytest.fixture
def mock_get_current_user():
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: MockUser(username="testuser")
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_list_dispensation_logs(mock_get_current_user):
    db = SessionLocal()
    create_dispensation_log(db, {
        "schedule_id": "sch_1",
        "patient_id": "pat_1",
        "dispenser_id": "disp_1",
        "medication_id": "med_1",
        "success": True,
    })
    create_dispensation_log(db, {
        "schedule_id": "sch_2",
        "patient_id": "pat_2",
        "dispenser_id": "disp_2",
        "medication_id": "med_2",
        "success": False,
        "error_message": "Slot empty"
    })
    db.close()

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
    create_refill_dependencies()
    db = SessionLocal()
    create_refill_log(db, {
        "dispenser_id": "disp_1",
        "slot_id": 1,
        "medication_id": "med_1",
        "quantity_added": 10,
        "performed_by": "testuser"
    })
    db.close()
    
    resp = client.get("/api/logs/refill")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["dispenser_id"] == "disp_1"
    assert data[0]["quantity_added"] == 10
