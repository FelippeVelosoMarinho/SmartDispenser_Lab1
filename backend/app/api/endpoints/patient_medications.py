"""Patient medications endpoints."""

import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.patient import get_patient
from app.crud.patient_medication import (
    get_patient_medications,
    create_patient_medication,
    update_patient_medication,
    delete_patient_medication,
)

router = APIRouter(prefix="/api/patients/{patient_id}/medications", tags=["patient-medications"])


class PatientMedicationIn(BaseModel):
    nome: str
    dosagem: str
    frequencia: str
    horarios: List[str]
    observacoes: Optional[str] = ""


class PatientMedicationOut(BaseModel):
    id: str
    nome: str
    dosagem: str
    frequencia: str
    horarios: List[str]
    observacoes: str


def _format(med) -> dict:
    horarios = med.horarios
    try:
        horarios = json.loads(horarios)
    except Exception:
        horarios = [horarios] if horarios else []
    return {
        "id": str(med.id),
        "nome": med.nome,
        "dosagem": med.dosagem,
        "frequencia": med.frequencia,
        "horarios": horarios,
        "observacoes": med.observacoes or "",
    }


def _authorize(db: Session, patient_id: str, current_user):
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    return patient


@router.get("", response_model=List[PatientMedicationOut])
async def list_medications(
    patient_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize(db, patient_id, current_user)
    meds = get_patient_medications(db, patient_id)
    return [_format(m) for m in meds]


@router.post("", response_model=PatientMedicationOut, status_code=201)
async def add_medication(
    patient_id: str,
    body: PatientMedicationIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize(db, patient_id, current_user)
    med = create_patient_medication(db, patient_id, body.model_dump())
    return _format(med)


@router.put("/{med_id}", response_model=PatientMedicationOut)
async def update_medication(
    patient_id: str,
    med_id: str,
    body: PatientMedicationIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize(db, patient_id, current_user)
    med = update_patient_medication(db, med_id, body.model_dump())
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return _format(med)


@router.delete("/{med_id}", status_code=204)
async def remove_medication(
    patient_id: str,
    med_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _authorize(db, patient_id, current_user)
    if not delete_patient_medication(db, med_id):
        raise HTTPException(status_code=404, detail="Medication not found")
