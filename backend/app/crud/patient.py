"""Patient CRUD operations (in-memory store)."""

import uuid
from typing import Optional, List, Dict

# Simple in-memory patient store (patient_id -> patient dict)
PATIENTS: Dict[str, dict] = {}


def create_patient(caregiver_username: str, data: dict) -> dict:
    """Create a new patient in the store."""
    patient_id = str(uuid.uuid4())
    patient = {
        "id": patient_id,
        "caregiver_username": caregiver_username,
        "name": data["name"],
        "age": data.get("age"),
        "condition": data.get("condition"),
        "dispensers": data.get("dispensers", []),
    }
    PATIENTS[patient_id] = patient
    return patient


def get_patients_by_caregiver(caregiver_username: str) -> List[dict]:
    """Get all patients for a specific caregiver."""
    return [p for p in PATIENTS.values() if p["caregiver_username"] == caregiver_username]


def get_patient(patient_id: str) -> Optional[dict]:
    """Get a patient by id."""
    return PATIENTS.get(patient_id)


def update_patient(patient_id: str, data: dict) -> Optional[dict]:
    """Update a patient."""
    if patient_id not in PATIENTS:
        return None
    patient = PATIENTS[patient_id]
    for key, value in data.items():
        if value is not None:
            patient[key] = value
    return patient


def delete_patient(patient_id: str) -> bool:
    """Delete a patient. Returns True if patient was deleted, False if not found."""
    if patient_id in PATIENTS:
        del PATIENTS[patient_id]
        return True
    return False

def clear_patients() -> None:
    """Clear all patients (useful for tests)."""
    PATIENTS.clear()
