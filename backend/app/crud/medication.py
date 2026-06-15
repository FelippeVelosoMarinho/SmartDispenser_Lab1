"""Medication CRUD operations (database store)."""

from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.domain import Medication


def create_medication(db: Session, data: dict) -> Medication:
    """Create a new medication in the catalog."""
    db_medication = Medication(
        name=data["name"],
        description=data.get("description"),
        dosage=data.get("dosage"),
    )
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return db_medication


def get_or_create_medication(db: Session, name: str, dosage: str = "") -> Medication:
    """Return existing medication by name (case-insensitive) or create a new one."""
    med = db.query(Medication).filter(func.lower(Medication.name) == name.lower()).first()
    if not med:
        med = Medication(name=name, dosage=dosage or None)
        db.add(med)
        db.flush()
    return med


def get_all_medications(db: Session, search: Optional[str] = None) -> List[Medication]:
    """Get all medications, optionally filtering by name."""
    query = db.query(Medication)
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.filter(Medication.name.ilike(search_lower))
    return query.all()
