"""Helpers for schedule time parsing and dispenser/slot resolution."""

from __future__ import annotations

import datetime
import uuid
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.domain import Dispenser, Schedule, Slot

MAX_SCHEDULE_POSITION = 21


def parse_schedule_time(time_str: str) -> Tuple[datetime.datetime, str, datetime.time]:
    """Parse UI time into (scheduled_at naive local, time_legacy, scheduled_time).

    Accepts:
    - YYYY-MM-DDTHH:MM (datetime-local)
    - YYYY-MM-DDTHH:MM:SS
    - HH:MM (today at that time)
    """
    raw = (time_str or "").strip()
    if not raw:
        raise ValueError("time is required")

    if "T" in raw:
        # datetime-local may lack seconds/timezone
        if len(raw) == 16:
            raw = raw + ":00"
        dt = datetime.datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        scheduled_at = dt
        time_legacy = dt.strftime("%Y-%m-%dT%H:%M")
    elif len(raw) == 5 and raw[2] == ":":
        hour, minute = int(raw[:2]), int(raw[3:5])
        now = datetime.datetime.now()
        scheduled_at = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        time_legacy = raw
    else:
        raise ValueError(f"invalid time format: {time_str}")

    return scheduled_at, time_legacy, scheduled_at.time()


def resolve_hardware_id(db: Session, dispenser_ref: str) -> Optional[str]:
    """Resolve dispenser UUID or hardware_id to hardware_id string."""
    if not dispenser_ref:
        return None
    try:
        uid = uuid.UUID(dispenser_ref)
        dispenser = db.query(Dispenser).filter(Dispenser.id == uid).first()
        return dispenser.hardware_id if dispenser else None
    except ValueError:
        dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == dispenser_ref).first()
        return dispenser_ref if dispenser else dispenser_ref


def validate_slot_position(db: Session, slot_id: int) -> Slot:
    """Ensure slot exists and position is within carousel range (1–21)."""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise ValueError(f"slot {slot_id} not found")
    if slot.position_number < 1 or slot.position_number > MAX_SCHEDULE_POSITION:
        raise ValueError(
            f"position {slot.position_number} is out of range (1–{MAX_SCHEDULE_POSITION})"
        )
    return slot


def carousel_slot_before_dispense(position_number: int) -> int:
    """Firmware slot index (0–20) expected immediately before advancing."""
    return position_number - 1


def carousel_slot_after_dispense(position_number: int) -> int:
    """Firmware slot index (0–20) after advancing for this position."""
    return position_number % MAX_SCHEDULE_POSITION  # position 21 → index 20


def format_schedule_response(schedule: Schedule) -> dict:
    time_val = schedule.time_legacy or ""
    if schedule.scheduled_at and not time_val:
        time_val = schedule.scheduled_at.strftime("%Y-%m-%dT%H:%M")
    return {
        "id": str(schedule.id),
        "patient_id": str(schedule.patient_id) if schedule.patient_id else "",
        "dispenser_id": schedule.dispenser_id or "",
        "slot_id": schedule.slot_id or 0,
        "time": time_val,
        "scheduled_at": schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
        "is_active": schedule.is_active if schedule.is_active is not None else True,
    }
