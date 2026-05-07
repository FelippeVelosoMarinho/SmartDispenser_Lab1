"""Medication CRUD operations (in-memory store)."""

import uuid
from typing import Dict, List, Optional

# Simple in-memory medication store (medication_id -> medication dict)
MEDICATIONS: Dict[str, dict] = {}


def create_medication(data: dict) -> dict:
    """Create a new medication in the catalog."""
    medication_id = str(uuid.uuid4())
    medication = {
        "id": medication_id,
        "name": data["name"],
        "description": data.get("description"),
        "dosage": data.get("dosage"),
    }
    MEDICATIONS[medication_id] = medication
    return medication


def get_all_medications(search: Optional[str] = None) -> List[dict]:
    """Get all medications, optionally filtering by name."""
    if not search:
        return list(MEDICATIONS.values())
    search_lower = search.lower()
    return [m for m in MEDICATIONS.values() if search_lower in m["name"].lower()]


def clear_medications() -> None:
    """Clear all medications (useful for tests)."""
    MEDICATIONS.clear()
