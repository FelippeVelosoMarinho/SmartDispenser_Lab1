"""Schedule CRUD operations (in-memory store)."""

import uuid
from typing import Dict, List, Optional

# Simple in-memory schedule store (schedule_id -> schedule dict)
SCHEDULES: Dict[str, dict] = {}


def create_schedule(data: dict) -> dict:
    """Create a new schedule."""
    schedule_id = str(uuid.uuid4())
    schedule = {
        "id": schedule_id,
        "patient_id": data["patient_id"],
        "dispenser_id": data["dispenser_id"],
        "medication_id": data["medication_id"],
        "slot_id": data["slot_id"],
        "time": data["time"],
        "quantity": data["quantity"],
    }
    SCHEDULES[schedule_id] = schedule
    return schedule


def get_schedules(patient_id: Optional[str] = None, dispenser_id: Optional[str] = None) -> List[dict]:
    """Get all schedules, optionally filtering by patient or dispenser."""
    results = list(SCHEDULES.values())
    if patient_id:
        results = [s for s in results if s["patient_id"] == patient_id]
    if dispenser_id:
        results = [s for s in results if s["dispenser_id"] == dispenser_id]
    return results


def get_schedule(schedule_id: str) -> Optional[dict]:
    """Get a specific schedule by ID."""
    return SCHEDULES.get(schedule_id)


def delete_schedule(schedule_id: str) -> bool:
    """Delete a schedule. Returns True if deleted, False if not found."""
    if schedule_id in SCHEDULES:
        del SCHEDULES[schedule_id]
        return True
    return False


def clear_schedules() -> None:
    """Clear all schedules (useful for tests)."""
    SCHEDULES.clear()
