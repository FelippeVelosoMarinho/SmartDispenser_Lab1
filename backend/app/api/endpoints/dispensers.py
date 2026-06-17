"""Dispensers endpoints."""

import ipaddress
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
    mark_dispenser_disconnected_after_wifi_reset,
    reset_dispenser_configuration,
    update_dispenser_status,
)
from app.crud.patient import get_patient, get_patients_by_caregiver
from app.models.domain import Dispenser, Drawer, Slot, SlotMedication, PendingCommand
from app.crud import command_queue as crud_command_queue
from app.crud.schedule import get_period_schedules, upsert_period_schedules
from app.core.config import TOTAL_CAROUSEL_SLOTS
from app.schemas.dispenser import (
    DiscoveredDispenser,
    DispenserDeletionStatus,
    DispenserForgetWifiResult,
    DispenserPairRequest,
    DispenserPublic,
    DispenserResetConfigurationResult,
    DispenserStatusPublic,
    HardwareStatusPublic,
    StartCycleResult,
)
from app.schemas.schedule import PeriodSchedulePublic, PeriodSchedulePut
from app.services.dispenser_online import refresh_dispenser_online_state
from app.services.esp_proxy import (
    get_hardware_status,
    post_calibrate,
    post_confirm,
    post_demo,
    get_demo_status,
    post_demo_stop,
)
from app.services.period_config import default_period_times

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
    db: Session = Depends(get_db),
):
    """Retorna dispensadores online e ainda não pareados com nenhum paciente."""
    from app.services.dispenser_online import is_dispenser_online
    unpaired = db.query(Dispenser).filter(Dispenser.patient_id.is_(None)).all()
    result = []
    for d in unpaired:
        if is_dispenser_online(d):
            result.append({
                "id": str(d.id),
                "serial": d.hardware_id,
                "mac": d.hardware_id,
                "rssi": 0,
                "firmware": "unknown",
            })
    return result


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
                .joinedload(Slot.slot_medications)
                .joinedload(SlotMedication.medication),
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
    # Only reset online state if no heartbeat has arrived yet.
    # If the ESP was already sending heartbeats before pairing, preserve is_online/last_sync.
    if not dispenser.last_sync:
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


def _is_private_lan_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False


def _unreachable_detail(ip: str | None, *, reason: str) -> dict:
    if ip and _is_private_lan_ip(ip):
        return {
            "code": "DISPENSER_LAN_ONLY",
            "message": (
                f"O servidor não consegue acessar o IP local do dispensador ({ip}). "
                "Use o painel web na mesma rede Wi-Fi do ESP32 ou execute o backend na LAN."
            ),
            "ip_address": ip,
            "reason": reason,
        }
    return {
        "code": "DISPENSER_UNREACHABLE",
        "message": "Não foi possível ler o status do hardware.",
        "reason": reason,
    }


def _require_dispenser_ip(dispenser: Dispenser) -> str:
    if not dispenser.ip_address:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DISPENSER_UNREACHABLE",
                "message": "Dispensador sem endereço IP — aguardando heartbeat.",
            },
        )
    return dispenser.ip_address


def _period_schedule_response(
    hardware_id: str,
    patient_id: str,
    rows: list,
    source: str,
) -> PeriodSchedulePublic:
    defaults = default_period_times()
    times = dict(defaults)
    is_active = True
    silent_mode = False
    for row in rows:
        if row.period and row.time_legacy:
            times[row.period] = row.time_legacy
        if row.is_active is not None:
            is_active = row.is_active
        if row.silent_mode:
            silent_mode = True
    return PeriodSchedulePublic(
        dispenser_id=hardware_id,
        patient_id=patient_id,
        morning_time=times["morning"],
        afternoon_time=times["afternoon"],
        night_time=times["night"],
        is_active=is_active,
        silent_mode=silent_mode,
        source=source,
    )


@router.get("/{hardware_id}/period-schedule", response_model=PeriodSchedulePublic)
async def get_period_schedule(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return morning/afternoon/night times for a dispenser (DB or env defaults)."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    rows = get_period_schedules(db, hardware_id)
    patient_id = str(dispenser.patient_id) if dispenser.patient_id else ""
    if rows:
        pid = str(rows[0].patient_id) if rows[0].patient_id else patient_id
        return _period_schedule_response(hardware_id, pid, rows, "database")
    defaults = default_period_times()
    return PeriodSchedulePublic(
        dispenser_id=hardware_id,
        patient_id=patient_id,
        morning_time=defaults["morning"],
        afternoon_time=defaults["afternoon"],
        night_time=defaults["night"],
        is_active=True,
        source="defaults",
    )


@router.put("/{hardware_id}/period-schedule", response_model=PeriodSchedulePublic)
async def put_period_schedule(
    hardware_id: str,
    body: PeriodSchedulePut,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert the three period schedules (manhã/tarde/noite) for sequential dispensing."""
    _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    patient = get_patient(db, body.patient_id)
    if not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")

    try:
        rows = upsert_period_schedules(
            db,
            hardware_id,
            body.patient_id,
            body.morning_time,
            body.afternoon_time,
            body.night_time,
            body.is_active,
            body.silent_mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _period_schedule_response(hardware_id, body.patient_id, rows, "database")


@router.get("/{hardware_id}/hardware-status", response_model=HardwareStatusPublic)
async def read_hardware_status(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ESP GET /status when reachable; otherwise telemetry from last heartbeat."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    ip = _require_dispenser_ip(dispenser)
    status = await get_hardware_status(ip)
    if status is None:
        if dispenser.current_slot is not None:
            return HardwareStatusPublic(
                current_slot=dispenser.current_slot,
                total_slots=TOTAL_CAROUSEL_SLOTS,
                awaiting_confirm=bool(dispenser.awaiting_confirm),
                last_confirmed_slot=-1,
                hardware_id=dispenser.hardware_id,
            )
        raise HTTPException(
            status_code=503,
            detail=_unreachable_detail(ip, reason="hardware_status"),
        )
    return HardwareStatusPublic(
        current_slot=int(status.get("current_slot", 0)),
        total_slots=int(status.get("total_slots", 21)),
        awaiting_confirm=status.get("awaiting_confirm") in (True, "true"),
        last_confirmed_slot=int(status.get("last_confirmed_slot", -1)),
        wifi_rssi=status.get("wifi_rssi"),
        hardware_id=status.get("hardware_id"),
        uptime_s=status.get("uptime_s"),
    )


@router.post("/{hardware_id}/start-refill", response_model=StartCycleResult)
async def start_refill_mode(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enter refill mode — blocks dispense commands until start-cycle is called."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    dispenser.is_refilling = True
    db.commit()
    return StartCycleResult(
        success=True,
        message="Modo reabastecimento ativado — dispensações bloqueadas até concluir.",
        current_slot=dispenser.current_slot or 0,
        hardware_id=hardware_id,
    )


@router.post("/{hardware_id}/start-cycle", response_model=StartCycleResult)
async def start_dispenser_cycle(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calibrate carousel (slot 0) after refill — LAN direct or heartbeat queue."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    dispenser.is_refilling = False
    db.commit()
    ip = _require_dispenser_ip(dispenser)

    if _is_private_lan_ip(ip):
        crud_command_queue.enqueue_calibrate(db, hardware_id)
        return StartCycleResult(
            success=True,
            message=(
                "Calibração enfileirada — o dispensador executará no próximo "
                "heartbeat (~30s)."
            ),
            current_slot=dispenser.current_slot or 0,
            hardware_id=hardware_id,
        )

    status = await get_hardware_status(ip)
    if status and status.get("awaiting_confirm") in (True, "true"):
        await post_confirm(ip)

    ok, _ = await post_calibrate(ip)
    if not ok:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ESP_CALIBRATE_FAILED",
                "message": "Falha ao calibrar o dispensador.",
            },
        )

    after = await get_hardware_status(ip)
    current_slot = int(after.get("current_slot", 0)) if after else 0

    return StartCycleResult(
        success=True,
        message="Ciclo iniciado — roleta calibrada na posição inicial.",
        current_slot=current_slot,
        hardware_id=hardware_id,
    )


@router.post("/{hardware_id}/demo")
async def start_demo_cycle(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proxy demo command to ESP32."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    ip = _require_dispenser_ip(dispenser)

    if _is_private_lan_ip(ip):
        crud_command_queue.enqueue_demo(db, hardware_id)
        return {
            "success": True,
            "message": "Demonstração enfileirada — o dispensador executará no próximo heartbeat (~30s)."
        }

    ok, _ = await post_demo(ip)
    if not ok:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ESP_DEMO_FAILED",
                "message": "Falha ao iniciar demo no dispensador.",
            },
        )
    return {"success": True, "message": "Demo iniciada com sucesso"}


@router.get("/{hardware_id}/demo-status")
async def read_demo_status(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proxy demo status from ESP32."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    ip = _require_dispenser_ip(dispenser)

    if _is_private_lan_ip(ip):
        raise HTTPException(
            status_code=503,
            detail=_unreachable_detail(ip, reason="demo-status"),
        )

    status = await get_demo_status(ip)
    if not status:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ESP_DEMO_STATUS_FAILED",
                "message": "Falha ao obter status da demo.",
            },
        )
    return status


@router.post("/{hardware_id}/demo-stop")
async def stop_demo_cycle(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proxy demo stop command to ESP32."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    ip = _require_dispenser_ip(dispenser)

    if _is_private_lan_ip(ip):
        raise HTTPException(
            status_code=503,
            detail=_unreachable_detail(ip, reason="demo-stop"),
        )

    ok, _ = await post_demo_stop(ip)
    if not ok:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ESP_DEMO_STOP_FAILED",
                "message": "Falha ao parar demo no dispensador.",
            },
        )
    return {"success": True, "message": "Demo parada com sucesso"}


@router.post("/{hardware_id}/reset-demo")
async def reset_demo_logs(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Limpa todo o histórico de dispensação e para qualquer demo em andamento."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    
    # 1. Limpar logs
    from app.models.domain import DispensationLog
    db.query(DispensationLog).filter(DispensationLog.dispenser_id_legacy == hardware_id).delete(synchronize_session=False)
    db.query(PendingCommand).filter(
        PendingCommand.hardware_id == hardware_id,
        PendingCommand.status.in_(crud_command_queue.ACTIVE_STATUSES),
    ).update(
        {
            PendingCommand.status: "superseded",
            PendingCommand.completed_at: datetime.datetime.utcnow(),
            PendingCommand.error_message: "demo reset",
        },
        synchronize_session=False,
    )
    dispenser.awaiting_confirm = False
    db.commit()
    
    # 2. Tentar parar a demo na placa se estiver online
    ip = dispenser.ip_address
    if ip and not _is_private_lan_ip(ip):
        await post_demo_stop(ip)
        
    return {"success": True, "message": "Demo resetada e histórico limpo com sucesso."}



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

    mark_dispenser_disconnected_after_wifi_reset(db, dispenser)

    return DispenserForgetWifiResult(
        success=True,
        message="Wi-Fi apagado no dispositivo. Ele reiniciará em modo Bluetooth — use Parear dispensador para reconectar.",
        hardware_id=hardware_id,
    )


@router.post("/{hardware_id}/sync-wifi-reset", response_model=DispenserForgetWifiResult)
async def sync_wifi_reset_dispenser(
    hardware_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark dispenser offline after a LAN-side POST /reset-wifi (backend cannot reach private IP)."""
    dispenser = _get_dispenser_for_caregiver(db, hardware_id, current_user.username)
    mark_dispenser_disconnected_after_wifi_reset(db, dispenser)
    return DispenserForgetWifiResult(
        success=True,
        message="Dispensador marcado como desconectado. Use Parear dispensador para reconectar via Bluetooth.",
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
