"""Patient CRUD operations (database store)."""

from typing import Optional, List
import uuid
from sqlalchemy.orm import Session
from app.models.domain import Patient


def create_patient(db: Session, caregiver_username: str, data: dict) -> Patient:
    """Create a new patient in the database."""
    db_patient = Patient(
        caregiver_username=caregiver_username,
        full_name=data["name"], # mapping to full_name as well to respect not null
        name=data["name"],
        age=data.get("age"),
        condition=data.get("condition"),
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def get_patients_by_caregiver(db: Session, caregiver_username: str) -> List[Patient]:
    """Get all patients for a specific caregiver."""
    return db.query(Patient).filter(Patient.caregiver_username == caregiver_username).all()


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    """Get a patient by id."""
    try:
        uid = uuid.UUID(patient_id)
    except ValueError:
        return None
    return db.query(Patient).filter(Patient.id == uid).first()


def update_patient(db: Session, patient_id: str, data: dict) -> Optional[Patient]:
    """Update a patient."""
    db_patient = get_patient(db, patient_id)
    if not db_patient:
        return None
        
    for key, value in data.items():
        if value is not None and hasattr(db_patient, key):
            setattr(db_patient, key, value)
            if key == "name":
                db_patient.full_name = value
                
    db.commit()
    db.refresh(db_patient)
    return db_patient


def delete_patient(db: Session, patient_id: str) -> bool:
    """Delete a patient. Returns True if patient was deleted, False if not found."""
    db_patient = get_patient(db, patient_id)
    if db_patient:
        db.delete(db_patient)
        db.commit()
        return True
    return False

