"""Patient medications endpoints."""

import json
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud.patient import get_patient
from app.crud.patient_medication import (
    create_patient_medication,
    delete_patient_medication,
    get_patient_medications,
    update_patient_medication,
)
from app.services.patient_medication_sync import (
    sync_patient_medication,
    unsync_patient_medication,
)

router = APIRouter(prefix="/api/patients/{patient_id}/medications", tags=["patient-medications"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DayPeriodItem(BaseModel):
    day: int                                          # 0=Monday … 6=Sunday
    period: Literal["morning", "afternoon", "night"]


class PatientMedicationIn(BaseModel):
    nome: str
    dosagem: str
    horarios: List[DayPeriodItem]
    observacoes: Optional[str] = ""


class PatientMedicationOut(BaseModel):
    id: str
    nome: str
    dosagem: str
    horarios: List[DayPeriodItem]
    observacoes: str
    configured_slots: Optional[List[int]] = None
    warning: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_horarios(raw: str) -> list[dict]:
    try:
        items = json.loads(raw or "[]")
    except (ValueError, TypeError):
        return []
    if not items or not isinstance(items[0], dict):
        return []   # old string-array format — return empty
    return items


def _format(med, configured_slots=None, warning=None) -> dict:
    return {
        "id": str(med.id),
        "nome": med.nome,
        "dosagem": med.dosagem,
        "horarios": _parse_horarios(med.horarios),
        "observacoes": med.observacoes or "",
        "configured_slots": configured_slots,
        "warning": warning,
    }


def _authorize(db: Session, patient_id: str, current_user):
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    return patient


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
    patient = _authorize(db, patient_id, current_user)

    horarios_json = json.dumps([h.model_dump() for h in body.horarios])
    med = create_patient_medication(db, patient_id, {
        "nome": body.nome,
        "dosagem": body.dosagem,
        "frequencia": "custom",      # kept for DB compat, not used
        "horarios": horarios_json,
        "observacoes": body.observacoes or "",
    })

    slots = sync_patient_medication(db, med, patient)
    warning = None if slots or not body.horarios else "Paciente sem dispensador pareado — a configuração será aplicada ao parear"
    return _format(med, configured_slots=slots, warning=warning)


@router.put("/{med_id}", response_model=PatientMedicationOut)
async def update_medication(
    patient_id: str,
    med_id: str,
    body: PatientMedicationIn,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _authorize(db, patient_id, current_user)

    from app.crud.patient_medication import get_patient_medication
    old_med = get_patient_medication(db, med_id)
    if not old_med:
        raise HTTPException(status_code=404, detail="Medication not found")

    unsync_patient_medication(db, old_med, patient)

    horarios_json = json.dumps([h.model_dump() for h in body.horarios])
    med = update_patient_medication(db, med_id, {
        "nome": body.nome,
        "dosagem": body.dosagem,
        "frequencia": "custom",
        "horarios": horarios_json,
        "observacoes": body.observacoes or "",
    })
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    slots = sync_patient_medication(db, med, patient)
    warning = None if slots or not body.horarios else "Paciente sem dispensador pareado"
    return _format(med, configured_slots=slots, warning=warning)


@router.delete("/{med_id}", status_code=204)
async def remove_medication(
    patient_id: str,
    med_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _authorize(db, patient_id, current_user)

    from app.crud.patient_medication import get_patient_medication
    med = get_patient_medication(db, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    unsync_patient_medication(db, med, patient)
    if not delete_patient_medication(db, med_id):
        raise HTTPException(status_code=404, detail="Medication not found")
