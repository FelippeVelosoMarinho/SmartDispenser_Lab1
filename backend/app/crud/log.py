"""Log CRUD operations (in-memory store)."""

import uuid
from typing import List, Optional
from datetime import datetime

# Simple in-memory logs list
DISPENSATION_LOGS: List[dict] = []
REFILL_LOGS: List[dict] = []


def create_dispensation_log(data: dict) -> dict:
    """Create a new dispensation log."""
    log = {
        "id": str(uuid.uuid4()),
        "schedule_id": data["schedule_id"],
        "patient_id": data["patient_id"],
        "dispenser_id": data["dispenser_id"],
        "medication_id": data["medication_id"],
        "timestamp": data.get("timestamp", datetime.now()),
        "success": data["success"],
        "error_message": data.get("error_message"),
    }
    DISPENSATION_LOGS.append(log)
    return log


def get_dispensation_logs(patient_id: Optional[str] = None, dispenser_id: Optional[str] = None) -> List[dict]:
    """Get dispensation logs, optionally filtering by patient or dispenser."""
    results = DISPENSATION_LOGS
    if patient_id:
        results = [log for log in results if log["patient_id"] == patient_id]
    if dispenser_id:
        results = [log for log in results if log["dispenser_id"] == dispenser_id]
    return results


def create_refill_log(data: dict) -> dict:
    """Create a new refill log."""
    log = {
        "id": str(uuid.uuid4()),
        "dispenser_id": data["dispenser_id"],
        "slot_id": data["slot_id"],
        "medication_id": data["medication_id"],
        "quantity_added": data["quantity_added"],
        "timestamp": data.get("timestamp", datetime.now()),
        "performed_by": data["performed_by"],
    }
    REFILL_LOGS.append(log)
    return log


def get_refill_logs(dispenser_id: Optional[str] = None) -> List[dict]:
    """Get refill logs, optionally filtering by dispenser."""
    results = REFILL_LOGS
    if dispenser_id:
        results = [log for log in results if log["dispenser_id"] == dispenser_id]
    return results


def clear_logs() -> None:
    """Clear all logs (useful for tests)."""
    DISPENSATION_LOGS.clear()
    REFILL_LOGS.clear()
