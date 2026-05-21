"""Schedules endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.schedule import (
    create_schedule,
    get_schedules,
    get_schedule,
    delete_schedule,
)
from app.crud.patient import get_patient, get_patients_by_caregiver
from app.schemas.schedule import ScheduleCreate, SchedulePublic

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


def _format_schedule(schedule) -> dict:
    return {
        "id": str(schedule.id),
        "patient_id": str(schedule.patient_id) if schedule.patient_id else "",
        "dispenser_id": schedule.dispenser_id or "",
        "medication_id": str(schedule.medication_id) if schedule.medication_id else "",
        "slot_id": schedule.slot_id or 0,
        "time": schedule.time_legacy or "",
        "quantity": schedule.pills_per_dose or 1,
    }

@router.get("", response_model=List[SchedulePublic])
async def list_schedules(
    patient_id: Optional[str] = Query(None, description="Filtrar por paciente"),
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todos os horários agendados para um paciente/dispenser."""
    if patient_id:
        patient = get_patient(db, patient_id)
        if not patient or patient.caregiver_username != current_user.username:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this patient's schedules"
            )

    schedules = get_schedules(db, patient_id=patient_id, dispenser_id=dispenser_id)

    if not patient_id:
        # Se não especificou paciente, mostra apenas os agendamentos dos pacientes desse cuidador
        caregiver_patients = {str(p.id) for p in get_patients_by_caregiver(db, current_user.username)}
        schedules = [s for s in schedules if str(s.patient_id) in caregiver_patients]

    return [_format_schedule(s) for s in schedules]


@router.post("", response_model=SchedulePublic, status_code=201)
async def register_schedule(
    schedule_in: ScheduleCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cria um novo agendamento (vincula slot_id, time e quantity)."""
    patient = get_patient(db, schedule_in.patient_id)
    if not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create schedules for this patient"
        )

    schedule = create_schedule(db, schedule_in.model_dump())
    return _format_schedule(schedule)


@router.delete("/{schedule_id}", status_code=204)
async def remove_schedule(
    schedule_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove um horário de medicação."""
    schedule = get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    patient = get_patient(db, str(schedule.patient_id))
    if not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this schedule"
        )

    delete_schedule(db, schedule_id)
    return None
