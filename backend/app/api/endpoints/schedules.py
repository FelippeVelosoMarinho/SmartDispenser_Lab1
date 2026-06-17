"""Schedules endpoints."""

from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.database import get_db
from app.crud.schedule import (
    create_schedule,
    get_schedules,
    get_schedule,
    delete_schedule,
    update_schedule,
)
from app.crud.patient import get_patient, get_patients_by_caregiver
from app.schemas.schedule import ScheduleCreate, SchedulePublic, ScheduleUpdate
from app.services.schedule_utils import format_schedule_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


def _authorize_patient(db: Session, patient_id: str, username: str) -> None:
    patient = get_patient(db, patient_id)
    if not patient or patient.caregiver_username != username:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this patient's schedules",
        )


@router.get("", response_model=List[SchedulePublic])
async def list_schedules(
    patient_id: Optional[str] = Query(None, description="Filtrar por paciente"),
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser (UUID ou hardware_id)"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista horários agendados para um paciente/dispenser."""
    if patient_id:
        _authorize_patient(db, patient_id, current_user.username)

    schedules = get_schedules(db, patient_id=patient_id, dispenser_id=dispenser_id)

    if not patient_id:
        caregiver_patients = {
            str(p.id) for p in get_patients_by_caregiver(db, current_user.username)
        }
        schedules = [s for s in schedules if str(s.patient_id) in caregiver_patients]

    return [format_schedule_response(s) for s in schedules]


@router.post("", response_model=SchedulePublic, status_code=201)
async def register_schedule(
    schedule_in: ScheduleCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cria um novo agendamento (slot + datetime + dispenser)."""
    logger.info("Recebido pedido para criar agendamento: %s", schedule_in.model_dump())
    try:
        patient = get_patient(db, schedule_in.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if patient.caregiver_username != current_user.username:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to create schedules for this patient",
            )

        schedule = create_schedule(db, schedule_in.model_dump())
        logger.info("Agendamento criado com sucesso: %s", schedule.id)
        return format_schedule_response(schedule)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Erro inesperado ao criar agendamento: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}")


@router.patch("/{schedule_id}", response_model=SchedulePublic)
async def patch_schedule(
    schedule_id: str,
    schedule_in: ScheduleUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza horário, slot ou is_active."""
    schedule = get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    patient = get_patient(db, str(schedule.patient_id))
    if not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to update this schedule")

    data = schedule_in.model_dump(exclude_unset=True)
    try:
        updated = update_schedule(db, schedule_id, data)
        if not updated:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return format_schedule_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{schedule_id}", status_code=204)
async def remove_schedule(
    schedule_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove um horário de medicação."""
    schedule = get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    patient = get_patient(db, str(schedule.patient_id))
    if not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this schedule",
        )

    delete_schedule(db, schedule_id)
    return None
