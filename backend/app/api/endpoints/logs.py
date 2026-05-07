"""Logs endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.crud.log import get_dispensation_logs, get_refill_logs
from app.schemas.log import DispensationLogPublic, RefillLogPublic

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/dispensation", response_model=List[DispensationLogPublic])
async def list_dispensation_logs(
    patient_id: Optional[str] = Query(None, description="Filtrar por paciente"),
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser"),
    current_user: dict = Depends(get_current_user),
):
    """Lista o histórico de quem tomou o quê, quando e se houve sucesso."""
    return get_dispensation_logs(patient_id=patient_id, dispenser_id=dispenser_id)


@router.get("/refill", response_model=List[RefillLogPublic])
async def list_refill_logs(
    dispenser_id: Optional[str] = Query(None, description="Filtrar por dispenser"),
    current_user: dict = Depends(get_current_user),
):
    """Histórico de quando os slots foram abastecidos."""
    return get_refill_logs(dispenser_id=dispenser_id)
