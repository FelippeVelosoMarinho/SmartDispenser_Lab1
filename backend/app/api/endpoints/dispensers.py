"""Dispensers endpoints."""

import logging
from typing import List
import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session, joinedload
from app.crud.dispenser import (
    assert_dispenser_deletable,
    delete_dispenser,
    get_deletion_status,
    get_dispenser_status,
    reset_dispenser_configuration,
    update_dispenser_status,
)
from app.crud.patient import get_patient, get_patients_by_caregiver
from app.models.domain import Dispenser, Drawer, Slot, SlotMedication
from app.schemas.dispenser import (
    DiscoveredDispenser,
    DispenserDeletionStatus,
    DispenserForgetWifiResult,
    DispenserPairRequest,
    DispenserPublic,
    DispenserResetConfigurationResult,
    DispenserStatusPublic,
)
from app.services.dispenser_online import refresh_dispenser_online_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dispensers", tags=["dispensers"])

_ESP_FORGET_TIMEOUT = 8.0

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


def _format_dispenser(dispenser: Dispenser, db: Session) -> dict:
    is_online = refresh_dispenser_online_state(db, dispenser, persist=True)

    return {
        "id": str(dispenser.id),
        "hardware_id": dispenser.hardware_id,
        "patient_id": str(dispenser.patient_id) if dispenser.patient_id else None,
        "patient_name": dispenser.patient.full_name if dispenser.patient else None,
        "is_online": is_online,
        "critical_stock": bool(dispenser.critical_stock),
        "last_sync": dispenser.last_sync,
        "ip_address": dispenser.ip_address,
    }


def _format_medication(medication) -> dict | None:
    if not medication:
        return None

    return {
        "id": str(medication.id),
        "name": medication.name,
        "dosage": medication.dosage,
        "description": medication.description,
    }


def _format_slot(slot: Slot) -> dict:
    medications_list = []
    if slot.slot_medications:
        for sm in slot.slot_medications:
            medications_list.append({
                "medication": _format_medication(sm.medication),
                "quantity": sm.quantity
            })
            
    return {
        "id": str(slot.id),
        "drawer_id": str(slot.drawer_id),
        "slot_number": slot.position_number,
        "medications": medications_list,
        "max_pill_capacity": int(slot.max_pill_capacity or 0),
    }


def _format_drawer(drawer: Drawer) -> dict:
    return {
        "id": str(drawer.id),
        "dispenser_id": str(drawer.dispenser_id),
        "drawer_number": drawer.id,
        "label": drawer.label,
        "slots": [_format_slot(slot) for slot in sorted(drawer.slots, key=lambda item: item.position_number)],
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
    return [_format_dispenser(dispenser, db) for dispenser in dispensers]


@router.get("/{dispenser_id}")
async def get_dispenser_details(
    dispenser_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a dispenser with drawers, slots and medications for the dashboard."""
    dispenser = (
        db.query(Dispenser)
        .options(
            joinedload(Dispenser.patient),
            joinedload(Dispenser.drawers)
            .joinedload(Drawer.slots)
            .joinedload(Slot.slot_medications)
            .joinedload(SlotMedication.medication),
        )
        .filter(Dispenser.id == dispenser_id)
        .first()
    )

    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")

    patient = dispenser.patient
    if not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to access this dispenser")

    # Auto-heal: cria a gaveta e os 31 slots se o dispenser estiver vazio (pareado antes da alteração)
    if not dispenser.drawers:
        drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
        db.add(drawer)
        db.commit()
        db.refresh(drawer)
        
        for i in range(1, 32):
            slot = Slot(
                drawer_id=drawer.id,
                position_number=i,
                max_pill_capacity=30
            )
            db.add(slot)
        db.commit()
        
        # Recarrega o dispenser com as relações recém-criadas
        dispenser = (
            db.query(Dispenser)
            .options(
                joinedload(Dispenser.patient),
                joinedload(Dispenser.drawers)
                .joinedload(Drawer.slots)
                .joinedload(Slot.medication),
            )
            .filter(Dispenser.id == dispenser_id)
            .first()
        )

    return {
        **_format_dispenser(dispenser, db),
        "drawers": [_format_drawer(drawer) for drawer in sorted(dispenser.drawers, key=lambda item: item.id)],
    }


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
    is_new = False
    if not dispenser:
        dispenser = Dispenser(hardware_id=hardware_id)
        is_new = True

    dispenser.patient_id = patient.id
    # Online only after a real heartbeat from the hardware (not at pair time).
    dispenser.is_online = False
    db.add(dispenser)
    db.commit()
    db.refresh(dispenser)

    # Inicializa gaveta e 21 slots vazios caso seja um dispenser recém-criado ou sem gavetas
    has_drawers = db.query(Drawer).filter(Drawer.dispenser_id == dispenser.id).first() is not None
    if is_new or not has_drawers:
        drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
        db.add(drawer)
        db.commit()
        db.refresh(drawer)
        
        for i in range(1, 32):
            slot = Slot(
                drawer_id=drawer.id,
                position_number=i,
                max_pill_capacity=30
            )
            db.add(slot)
        db.commit()
        db.refresh(dispenser)

    return _format_dispenser(dispenser, db)


def _get_dispenser_for_caregiver(
    db: Session,
    hardware_id: str,
    username: str,
) -> Dispenser:
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")

    patient = dispenser.patient
    if patient and patient.caregiver_username != username:
        raise HTTPException(status_code=403, detail="Not authorized to access this dispenser")

    return dispenser


@router.get("/{hardware_id}/deletion-status", response_model=DispenserDeletionStatus)
async def dispenser_deletion_status(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Indica se o dispensador pode ser removido e o que ainda impede a exclusão."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    return get_deletion_status(db, dispenser)


@router.post(
    "/{hardware_id}/reset-configuration",
    response_model=DispenserResetConfigurationResult,
)
async def dispenser_reset_configuration(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove medicamentos e horários para permitir exclusão do dispensador."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    return reset_dispenser_configuration(db, dispenser)


@router.post("/{hardware_id}/forget-wifi", response_model=DispenserForgetWifiResult)
async def forget_dispenser_wifi(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apaga credenciais Wi-Fi no ESP (POST /reset-wifi) para voltar ao modo Bluetooth."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    refresh_dispenser_online_state(db, dispenser, persist=True)

    if not dispenser.ip_address:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DISPENSER_UNREACHABLE",
                "message": "Dispensador sem endereço IP — não foi possível enviar reset de Wi-Fi.",
            },
        )

    url = f"http://{dispenser.ip_address}/reset-wifi"
    try:
        async with httpx.AsyncClient(timeout=_ESP_FORGET_TIMEOUT) as client:
            resp = await client.post(url)
    except httpx.ConnectError as exc:
        logger.warning("[forget-wifi] Cannot reach %s: %s", url, exc)
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DISPENSER_UNREACHABLE",
                "message": "Não foi possível contactar o dispensador na rede.",
            },
        ) from exc
    except httpx.TimeoutException as exc:
        logger.warning("[forget-wifi] Timeout calling %s", url)
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DISPENSER_UNREACHABLE",
                "message": "Tempo esgotado ao contactar o dispensador.",
            },
        ) from exc

    if resp.status_code != 200:
        logger.warning("[forget-wifi] ESP returned HTTP %s", resp.status_code)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ESP_RESET_WIFI_FAILED",
                "message": f"O dispensador respondeu com HTTP {resp.status_code}.",
            },
        )

    return DispenserForgetWifiResult(
        success=True,
        message="Wi-Fi apagado no dispositivo. Ele reiniciará em modo Bluetooth.",
        hardware_id=hardware_id,
    )


@router.delete("/{hardware_id}", status_code=204)
async def remove_dispenser(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove um dispensador após a configuração (slots/horários) estar limpa."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    assert_dispenser_deletable(db, dispenser)
    delete_dispenser(db, dispenser)
    db.commit()
    return None


@router.get("/{id}/status", response_model=DispenserStatusPublic)
async def get_status(
    id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rota de telemetria (estoque crítico e status online)."""
    return get_dispenser_status(db, id)
