"""Medications endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.crud.medication import create_medication, get_all_medications
from app.schemas.medication import MedicationCreate, MedicationPublic

router = APIRouter(prefix="/api/medications", tags=["medications"])


@router.get("", response_model=List[MedicationPublic])
async def list_medications(
    search: Optional[str] = Query(None, description="Termo de busca pelo nome do medicamento"),
    current_user: dict = Depends(get_current_user),
):
    """Busca no catálogo de medicamentos cadastrados."""
    return get_all_medications(search)


@router.post("", response_model=MedicationPublic, status_code=201)
async def register_medication(
    medication_in: MedicationCreate,
    current_user: dict = Depends(get_current_user),
):
    """Adiciona um novo medicamento ao catálogo geral."""
    return create_medication(medication_in.model_dump())
