"""Schedule CRUD operations (database store)."""

from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from app.models.domain import Schedule


def create_schedule(db: Session, data: dict) -> Schedule:
    """Create a new schedule."""
    # Handle safe parsing of patient_id as UUID
    try:
        pid = uuid.UUID(data["patient_id"])
    except (ValueError, TypeError):
        pid = None
        
    db_schedule = Schedule(
        patient_id=pid,
        dispenser_id=data["dispenser_id"],
        slot_id=data["slot_id"],
        time_legacy=data["time"],
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def get_schedules(db: Session, patient_id: Optional[str] = None, dispenser_id: Optional[str] = None) -> List[Schedule]:
    """Get all schedules, optionally filtering by patient or dispenser."""
    query = db.query(Schedule)
    if patient_id:
        try:
            pid = uuid.UUID(patient_id)
            query = query.filter(Schedule.patient_id == pid)
        except ValueError:
            pass # ignore invalid UUIDs
    if dispenser_id:
        query = query.filter(Schedule.dispenser_id == dispenser_id)
    return query.all()


def get_schedule(db: Session, schedule_id: str) -> Optional[Schedule]:
    """Get a specific schedule by ID."""
    try:
        sid = uuid.UUID(schedule_id)
    except ValueError:
        return None
    return db.query(Schedule).filter(Schedule.id == sid).first()


def delete_schedule(db: Session, schedule_id: str) -> bool:
    """Delete a schedule. Returns True if deleted, False if not found."""
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule:
        db.delete(db_schedule)
        db.commit()
        return True
    return False
