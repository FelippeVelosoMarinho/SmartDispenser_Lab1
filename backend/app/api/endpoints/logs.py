"""Logs endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.log import get_dispensation_logs, get_refill_logs
from app.schemas.log import DispensationLogPublic, RefillLogPublic

router = APIRouter(prefix="/api/logs", tags=["logs"])


def _format_dispensation_log(log) -> dict:
    return {
        "id": str(log.id),
        "schedule_id": log.schedule_id_legacy or "",
        "patient_id": log.patient_id_legacy or "",
        "dispenser_id": log.dispenser_id_legacy or "",
        "medication_id": log.medication_id_legacy or "",
        "medication_name": log.medication_name_snapshot or None,
        "timestamp": log.actual_execution_time,
        "success": log.success or False,
        "status": log.status or None,
        "error_message": log.error_message,
    }


def _format_refill_log(log) -> dict:
    return {
        "id": str(log.id),
        "dispenser_id": log.dispenser_id_legacy or "",
        "slot_id": log.slot_id or 0,
        "medication_id": log.medication_id_legacy or "",
        "quantity_added": log.quantity_added or 0,
        "timestamp": log.created_at,
        "performed_by": log.performed_by_legacy or ""
    }


@router.get("/dispensation", response_model=List[DispensationLogPublic])
async def list_dispensation_logs(
    patient_id: Optional[str] = Query(None, description="Filtrar por paciente"),
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista o histórico de quem tomou o quê, quando e se houve sucesso."""
    logs = get_dispensation_logs(db, patient_id=patient_id, dispenser_id=dispenser_id)
    return [_format_dispensation_log(log) for log in logs]


@router.get("/refill", response_model=List[RefillLogPublic])
async def list_refill_logs(
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Histórico de quando os slots foram abastecidos."""
    logs = get_refill_logs(db, dispenser_id=dispenser_id)
    return [_format_refill_log(log) for log in logs]
