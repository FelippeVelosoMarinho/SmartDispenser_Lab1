"""Medication CRUD operations (database store)."""

from typing import List, Optional
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


def get_all_medications(db: Session, search: Optional[str] = None) -> List[Medication]:
    """Get all medications, optionally filtering by name."""
    query = db.query(Medication)
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.filter(Medication.name.ilike(search_lower))
    return query.all()
