"""Patients endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.crud.patient import (
    create_patient,
    get_patient,
    get_patients_by_caregiver,
    update_patient,
)
from app.schemas.patient import PatientCreate, PatientPublic, PatientUpdate

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("", response_model=List[PatientPublic])
async def list_patients(current_user: dict = Depends(get_current_user)):
    """Lista os pacientes vinculados ao cuidador."""
    return get_patients_by_caregiver(current_user["username"])


@router.post("", response_model=PatientPublic, status_code=201)
async def register_patient(
    patient_in: PatientCreate,
    current_user: dict = Depends(get_current_user),
):
    """Cadastra um novo paciente."""
    return create_patient(current_user["username"], patient_in.model_dump())


@router.get("/{patient_id}", response_model=PatientPublic)
async def get_patient_details(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Detalhes de um paciente específico (incluindo seus dispensers)."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient["caregiver_username"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this patient")
    return patient


@router.patch("/{patient_id}", response_model=PatientPublic)
async def update_patient_data(
    patient_id: str,
    patient_in: PatientUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza dados do paciente."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient["caregiver_username"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this patient")
    
    updated = update_patient(patient_id, patient_in.model_dump(exclude_unset=True))
    return updated
