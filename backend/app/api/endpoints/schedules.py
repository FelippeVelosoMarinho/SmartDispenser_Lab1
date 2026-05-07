"""Schedules endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.crud.schedule import (
    create_schedule,
    get_schedules,
    get_schedule,
    delete_schedule,
)
from app.crud.patient import get_patient, get_patients_by_caregiver
from app.schemas.schedule import ScheduleCreate, SchedulePublic

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=List[SchedulePublic])
async def list_schedules(
    patient_id: Optional[str] = Query(None, description="Filtrar por paciente"),
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser"),
    current_user: dict = Depends(get_current_user),
):
    """Lista todos os horários agendados para um paciente/dispenser."""
    if patient_id:
        patient = get_patient(patient_id)
        if not patient or patient["caregiver_username"] != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this patient's schedules"
            )

    schedules = get_schedules(patient_id=patient_id, dispenser_id=dispenser_id)

    if not patient_id:
        # Se não especificou paciente, mostra apenas os agendamentos dos pacientes desse cuidador
        caregiver_patients = {p["id"] for p in get_patients_by_caregiver(current_user["username"])}
        schedules = [s for s in schedules if s["patient_id"] in caregiver_patients]

    return schedules


@router.post("", response_model=SchedulePublic, status_code=201)
async def register_schedule(
    schedule_in: ScheduleCreate,
    current_user: dict = Depends(get_current_user),
):
    """Cria um novo agendamento (vincula slot_id, time e quantity)."""
    patient = get_patient(schedule_in.patient_id)
    if not patient or patient["caregiver_username"] != current_user["username"]:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create schedules for this patient"
        )

    return create_schedule(schedule_in.model_dump())


@router.delete("/{schedule_id}", status_code=204)
async def remove_schedule(
    schedule_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um horário de medicação."""
    schedule = get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    patient = get_patient(schedule["patient_id"])
    if not patient or patient["caregiver_username"] != current_user["username"]:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this schedule"
        )

    delete_schedule(schedule_id)
    return None
