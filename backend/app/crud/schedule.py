"""Schedule CRUD operations (database store)."""

from typing import List, Optional
import uuid

from sqlalchemy.orm import Session

from app.models.domain import Dispenser, Schedule
from app.services.schedule_utils import (
    parse_schedule_time,
    resolve_hardware_id,
    validate_slot_position,
)


def create_schedule(db: Session, data: dict) -> Schedule:
    """Create a new schedule."""
    try:
        pid = uuid.UUID(data["patient_id"])
    except (ValueError, TypeError):
        pid = None

    slot = validate_slot_position(db, data["slot_id"])
    scheduled_at, time_legacy, scheduled_time = parse_schedule_time(data["time"])
    hardware_id = resolve_hardware_id(db, data["dispenser_id"])
    if not hardware_id:
        raise ValueError(f"dispenser not found: {data['dispenser_id']}")

    is_active = data.get("is_active", True)

    db_schedule = Schedule(
        patient_id=pid,
        dispenser_id=hardware_id,
        slot_id=slot.id,
        scheduled_at=scheduled_at,
        scheduled_time=scheduled_time,
        time_legacy=time_legacy,
        is_active=is_active,
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def update_schedule(db: Session, schedule_id: str, data: dict) -> Optional[Schedule]:
    """Update an existing schedule."""
    db_schedule = get_schedule(db, schedule_id)
    if not db_schedule:
        return None

    if "slot_id" in data and data["slot_id"] is not None:
        slot = validate_slot_position(db, data["slot_id"])
        db_schedule.slot_id = slot.id

    if "time" in data and data["time"] is not None:
        scheduled_at, time_legacy, scheduled_time = parse_schedule_time(data["time"])
        db_schedule.scheduled_at = scheduled_at
        db_schedule.time_legacy = time_legacy
        db_schedule.scheduled_time = scheduled_time

    if "is_active" in data and data["is_active"] is not None:
        db_schedule.is_active = data["is_active"]

    if "dispenser_id" in data and data["dispenser_id"] is not None:
        hardware_id = resolve_hardware_id(db, data["dispenser_id"])
        if hardware_id:
            db_schedule.dispenser_id = hardware_id

    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def get_schedules(
    db: Session,
    patient_id: Optional[str] = None,
    dispenser_id: Optional[str] = None,
) -> List[Schedule]:
    """Get schedules, optionally filtering by patient or dispenser (UUID or hardware_id)."""
    query = db.query(Schedule)
    if patient_id:
        try:
            pid = uuid.UUID(patient_id)
            query = query.filter(Schedule.patient_id == pid)
        except ValueError:
            pass
    if dispenser_id:
        hardware_id = resolve_hardware_id(db, dispenser_id)
        if hardware_id:
            query = query.filter(Schedule.dispenser_id == hardware_id)
        else:
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


def get_period_schedules(db: Session, hardware_id: str) -> List[Schedule]:
    """Return period-based schedules (morning/afternoon/night) for a dispenser."""
    resolved = resolve_hardware_id(db, hardware_id) or hardware_id
    return (
        db.query(Schedule)
        .filter(Schedule.dispenser_id == resolved)
        .filter(Schedule.period.isnot(None))
        .all()
    )


def upsert_period_schedules(
    db: Session,
    hardware_id: str,
    patient_id: str,
    morning_time: str,
    afternoon_time: str,
    night_time: str,
    is_active: bool = True,
    silent_mode: bool = False,
) -> List[Schedule]:
    """Create or update the three period schedules for a dispenser."""
    resolved = resolve_hardware_id(db, hardware_id)
    if not resolved:
        raise ValueError(f"dispenser not found: {hardware_id}")

    try:
        pid = uuid.UUID(patient_id)
    except (ValueError, TypeError):
        raise ValueError("invalid patient_id")

    period_times = {
        "morning": morning_time,
        "afternoon": afternoon_time,
        "night": night_time,
    }

    results: List[Schedule] = []
    for period, time_str in period_times.items():
        scheduled_at, time_legacy, scheduled_time = parse_schedule_time(time_str)
        existing = (
            db.query(Schedule)
            .filter(Schedule.dispenser_id == resolved)
            .filter(Schedule.period == period)
            .first()
        )
        if existing:
            existing.patient_id = pid
            existing.scheduled_at = scheduled_at
            existing.time_legacy = time_legacy
            existing.scheduled_time = scheduled_time
            existing.is_active = is_active
            existing.silent_mode = silent_mode
            existing.slot_id = None
            db.commit()
            db.refresh(existing)
            results.append(existing)
        else:
            row = Schedule(
                patient_id=pid,
                dispenser_id=resolved,
                period=period,
                slot_id=None,
                scheduled_at=scheduled_at,
                scheduled_time=scheduled_time,
                time_legacy=time_legacy,
                is_active=is_active,
                silent_mode=silent_mode,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            results.append(row)

    return results
