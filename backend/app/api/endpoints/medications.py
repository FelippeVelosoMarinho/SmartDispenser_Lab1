"""Medications endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.medication import create_medication, get_all_medications
from app.schemas.medication import MedicationCreate, MedicationPublic

router = APIRouter(prefix="/api/medications", tags=["medications"])


def _format_medication(medication) -> dict:
    return {
        "id": str(medication.id),
        "name": medication.name,
        "description": medication.description,
        "dosage": medication.dosage
    }

@router.get("", response_model=List[MedicationPublic])
async def list_medications(
    search: Optional[str] = Query(None, description="Termo de busca pelo nome do medicamento"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca no catálogo de medicamentos cadastrados."""
    medications = get_all_medications(db, search)
    return [_format_medication(m) for m in medications]


@router.post("", response_model=MedicationPublic, status_code=201)
async def register_medication(
    medication_in: MedicationCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adiciona um novo medicamento ao catálogo geral."""
    medication = create_medication(db, medication_in.model_dump())
    return _format_medication(medication)
