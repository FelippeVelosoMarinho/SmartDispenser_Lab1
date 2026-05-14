"""Dispensers endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.crud.dispenser import get_dispenser_status, update_dispenser_status
from app.crud.patient import get_patient, get_patients_by_caregiver
from app.models.domain import Dispenser
from app.schemas.dispenser import (
    DiscoveredDispenser,
    DispenserPairRequest,
    DispenserPublic,
    DispenserStatusPublic,
)

router = APIRouter(prefix="/api/dispensers", tags=["dispensers"])

# Mock discovered dispensers for testing/demo
_MOCK_DISCOVERED = [
    {
        "id": "d-101",
        "serial": "ESP-C3-011",
        "mac": "A4:CF:12:8B:00:11",
        "rssi": -42,
        "firmware": "1.4.2",
    },
    {
        "id": "d-102",
        "serial": "ESP-C3-012",
        "mac": "A4:CF:12:8B:00:12",
        "rssi": -58,
        "firmware": "1.4.2",
    },
    {
        "id": "d-103",
        "serial": "ESP-C3-013",
        "mac": "A4:CF:12:8B:00:13",
        "rssi": -67,
        "firmware": "1.3.9",
    },
    {
        "id": "d-104",
        "serial": "ESP-C3-014",
        "mac": "A4:CF:12:8B:00:14",
        "rssi": -78,
        "firmware": "1.4.2",
    },
]


def _format_dispenser(dispenser: Dispenser) -> dict:
    return {
        "id": str(dispenser.id),
        "hardware_id": dispenser.hardware_id,
        "patient_id": str(dispenser.patient_id) if dispenser.patient_id else None,
        "patient_name": dispenser.patient.full_name if dispenser.patient else None,
        "is_online": bool(dispenser.is_online),
        "battery_level": float(dispenser.battery_level) if dispenser.battery_level is not None else 100.0,
        "critical_stock": bool(dispenser.critical_stock),
        "last_sync": dispenser.last_sync,
    }


@router.get("/discover", response_model=List[DiscoveredDispenser])
async def discover_dispensers(
    current_user = Depends(get_current_user),
):
    """Descobre dispensadores disponíveis para pareamento.
    
    Retorna uma lista de dispositivos disponíveis descobertos na rede.
    Atualmente usa dados mock para fins de teste/demo.
    """
    return _MOCK_DISCOVERED


@router.get("", response_model=List[DispenserPublic])
async def list_dispensers(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista os dispensadores associados aos pacientes do cuidador."""
    patients = get_patients_by_caregiver(db, current_user.username)
    dispensers = []
    for patient in patients:
        dispensers.extend(patient.dispensers or [])
    return [_format_dispenser(dispenser) for dispenser in dispensers]


@router.post("/{hardware_id}/pair", response_model=DispenserPublic)
async def pair_dispenser(
    hardware_id: str,
    pair_in: DispenserPairRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vincula um dispensador a um paciente."""
    patient = get_patient(db, pair_in.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to pair this patient")

    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    if not dispenser:
        dispenser = Dispenser(hardware_id=hardware_id)

    dispenser.patient_id = patient.id
    db.add(dispenser)
    db.commit()
    db.refresh(dispenser)
    return _format_dispenser(dispenser)


@router.delete("/{hardware_id}", status_code=204)
async def remove_dispenser(
    hardware_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove um dispensador do banco."""
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")

    patient = dispenser.patient
    if patient and patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dispenser")

    db.delete(dispenser)
    db.commit()
    return None


@router.get("/{id}/status", response_model=DispenserStatusPublic)
async def get_status(
    id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rota de telemetria (check de bateria, nível de estoque crítico e status online)."""
    return get_dispenser_status(db, id)
