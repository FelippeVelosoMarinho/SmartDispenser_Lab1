"""Patients endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.patient import (
    create_patient,
    get_patient,
    get_patients_by_caregiver,
    update_patient,
    delete_patient,
)
from app.schemas.patient import PatientCreate, PatientPublic, PatientUpdate

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _format_patient(patient) -> dict:
    return {
        "id": str(patient.id),
        "name": patient.name or patient.full_name,
        "age": patient.age,
        "condition": patient.condition,
        "caregiver_username": patient.caregiver_username,
        "dispensers": [d.hardware_id for d in patient.dispensers] if patient.dispensers else []
    }

@router.get("", response_model=List[PatientPublic])
async def list_patients(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista os pacientes vinculados ao cuidador."""
    patients = get_patients_by_caregiver(db, current_user.username)
    return [_format_patient(p) for p in patients]


@router.post("", response_model=PatientPublic, status_code=201)
async def register_patient(
    patient_in: PatientCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cadastra um novo paciente."""
    patient = create_patient(db, current_user.username, patient_in.model_dump())
    return _format_patient(patient)


@router.get("/{patient_id}", response_model=PatientPublic)
async def get_patient_details(
    patient_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detalhes de um paciente específico (incluindo seus dispensers)."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to access this patient")
    return _format_patient(patient)


@router.patch("/{patient_id}", response_model=PatientPublic)
async def update_patient_data(
    patient_id: str,
    patient_in: PatientUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza dados do paciente."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to update this patient")
    
    updated = update_patient(db, patient_id, patient_in.model_dump(exclude_unset=True))
    return _format_patient(updated)


@router.delete("/{patient_id}", status_code=204)
async def remove_patient(
    patient_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deleta um paciente."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to delete this patient")
    
    delete_patient(db, patient_id)
    return None

