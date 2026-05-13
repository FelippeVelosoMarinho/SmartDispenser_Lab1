"""Dispensers endpoints."""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.dispenser import get_dispenser_status
from app.schemas.dispenser import DispenserStatusPublic

router = APIRouter(prefix="/api/dispensers", tags=["dispensers"])


@router.get("/{id}/status", response_model=DispenserStatusPublic)
async def get_status(
    id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rota de telemetria (check de bateria, nível de estoque crítico e status online)."""
    return get_dispenser_status(db, id)
