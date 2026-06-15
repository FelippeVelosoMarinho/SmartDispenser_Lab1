"""CRUD for patient-specific medications."""

import json
from typing import List
from sqlalchemy.orm import Session
from app.models.domain import PatientMedication
import uuid


def get_patient_medication(db: Session, med_id: str) -> PatientMedication | None:
    return db.query(PatientMedication).filter(PatientMedication.id == med_id).first()


def get_patient_medications(db: Session, patient_id: str) -> List[PatientMedication]:
    return (
        db.query(PatientMedication)
        .filter(PatientMedication.patient_id == patient_id)
        .order_by(PatientMedication.created_at)
        .all()
    )


def create_patient_medication(db: Session, patient_id: str, data: dict) -> PatientMedication:
    horarios = data["horarios"]
    med = PatientMedication(
        patient_id=patient_id,
        nome=data["nome"],
        dosagem=data["dosagem"],
        frequencia=data["frequencia"],
        horarios=horarios if isinstance(horarios, str) else json.dumps(horarios),
        observacoes=data.get("observacoes", ""),
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def update_patient_medication(db: Session, med_id: str, data: dict) -> PatientMedication | None:
    med = db.query(PatientMedication).filter(PatientMedication.id == med_id).first()
    if not med:
        return None
    for field in ("nome", "dosagem", "frequencia", "observacoes"):
        if field in data:
            setattr(med, field, data[field])
    if "horarios" in data:
        h = data["horarios"]
        med.horarios = h if isinstance(h, str) else json.dumps(h)
    db.commit()
    db.refresh(med)
    return med


def delete_patient_medication(db: Session, med_id: str) -> bool:
    med = db.query(PatientMedication).filter(PatientMedication.id == med_id).first()
    if not med:
        return False
    db.delete(med)
    db.commit()
    return True
