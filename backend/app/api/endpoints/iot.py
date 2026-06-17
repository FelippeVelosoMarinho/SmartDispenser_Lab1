"""IoT/Hardware endpoints."""

import datetime
import time
import uuid

import httpx
from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db

from app.core.config import (
    COMMAND_ACK_TIMEOUT_SECONDS,
    ESP32_BASE_URL,
    TOTAL_CAROUSEL_SLOTS,
)
from app.crud import command_queue as crud_command_queue
from app.crud import schedule as crud_schedule
from app.crud import log as crud_log
from app.crud import dispenser as crud_dispenser
from app.services.dispensation_log import record_schedule_dispensation_log
from app.services.schedule_utils import carousel_slot_after_sequential
from app.models.domain import User, Patient, Dispenser, Medication, Schedule, DispensationLog
from app.services.notifier import send_email_notification
from app.services.templates import (
    get_dispensation_success_template,
    get_dispensation_failure_template,
    get_critical_stock_template,
)
from app.schemas.iot import (
    HealthResponse,
    LedCommand,
    LedStatusResponse,
    ToggleResponse,
    SyncResponse,
    SlotConfig,
    IotEventCreate,
    IotEventResponse,
    HeartbeatCreate,
    HeartbeatResponse,
    PendingCommandPublic,
)

router = APIRouter(prefix="/api", tags=["iot"])


PERIOD_LABELS = {
    "morning": "Manhã",
    "afternoon": "Tarde",
    "night": "Noite",
}


def _period_label(period: str | None) -> str | None:
    if not period:
        return None
    return PERIOD_LABELS.get(period, period)


def _resolve_patient_for_log(
    db: Session,
    *,
    patient_id: str | None,
    dispenser_id: str,
) -> Patient | None:
    if patient_id and patient_id != "unknown":
        try:
            patient_uuid = uuid.UUID(patient_id)
            patient = db.query(Patient).filter(Patient.id == patient_uuid).first()
            if patient:
                return patient
        except ValueError:
            pass

    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == dispenser_id).first()
    if dispenser and dispenser.patient_id:
        return db.query(Patient).filter(Patient.id == dispenser.patient_id).first()

    return None


def _resolve_medication_name(
    db: Session,
    *,
    medication_id: str | None,
    schedule: Schedule | None,
    fallback: str | None,
) -> str:
    if medication_id and medication_id != "unknown":
        try:
            med_id = int(medication_id)
            medication = db.query(Medication).filter(Medication.id == med_id).first()
            if medication:
                return medication.name
        except ValueError:
            return medication_id

    if fallback:
        return fallback

    if schedule and schedule.slot and schedule.slot.slot_medications:
        medication = schedule.slot.slot_medications[0].medication
        if medication:
            return medication.name

    return "Medicamento"


def _schedule_from_log(db: Session, log: DispensationLog) -> Schedule | None:
    if not log.schedule_id_legacy:
        return None
    try:
        schedule_id = uuid.UUID(log.schedule_id_legacy)
    except ValueError:
        return None
    return db.query(Schedule).filter(Schedule.id == schedule_id).first()


def _enqueue_dispensation_notification(
    *,
    background_tasks: BackgroundTasks,
    db: Session,
    log: DispensationLog,
    patient: Patient | None,
    medication_name: str,
    period: str | None,
) -> None:
    if log.caregiver_notified:
        return

    if not patient and log.patient_id_legacy:
        patient = _resolve_patient_for_log(
            db,
            patient_id=log.patient_id_legacy,
            dispenser_id=log.dispenser_id_legacy or "",
        )
    elif not patient and log.dispenser_id_legacy:
        patient = _resolve_patient_for_log(
            db,
            patient_id=None,
            dispenser_id=log.dispenser_id_legacy,
        )

    caregiver_user = None
    if patient and patient.caregiver_username:
        caregiver_user = db.query(User).filter(User.username == patient.caregiver_username).first()

    if not (caregiver_user and caregiver_user.notifications_enabled and caregiver_user.email):
        return

    patient_name = patient.full_name or patient.name or "Paciente"
    period_label = _period_label(period)
    subject_period = f" ({period_label})" if period_label else ""

    if log.success:
        html_body = get_dispensation_success_template(
            patient_name=patient_name,
            medication_name=medication_name,
            time_str=log.actual_execution_time.strftime("%d/%m/%Y %H:%M:%S"),
            period_label=period_label,
        )
        subject = f"SmartDispenser: Ingestão de {patient_name}{subject_period} confirmada"
    else:
        html_body = get_dispensation_failure_template(
            patient_name=patient_name,
            medication_name=medication_name,
            scheduled_time=period_label or "Dose programada",
            error_message=log.error_message or "Não confirmado pelo paciente",
            period_label=period_label,
        )
        subject = f"Alerta SmartDispenser: Medicação NÃO confirmada para {patient_name}{subject_period}"

    background_tasks.add_task(
        send_email_notification,
        to_email=caregiver_user.email,
        subject=subject,
        html_body=html_body,
    )
    log.caregiver_notified = True
    db.commit()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check — also pings ESP32 to verify connectivity."""
    client: httpx.AsyncClient = request.app.state.http_client
    esp32_reachable = False
    esp32_ip = ESP32_BASE_URL.replace("http://", "")

    try:
        response = await client.get("/status")
        esp32_reachable = response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    return HealthResponse(
        status="ok",
        esp32_ip=esp32_ip,
        esp32_reachable=esp32_reachable,
    )


@router.get("/led/status", response_model=LedStatusResponse)
async def get_led_status(request: Request):
    """Fetch current LED status from ESP32."""
    client: httpx.AsyncClient = request.app.state.http_client

    try:
        start = time.perf_counter()
        response = await client.get("/status")
        latency = (time.perf_counter() - start) * 1000  # ms

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"ESP32 returned status {response.status_code}",
            )

        data = response.json()
        return LedStatusResponse(
            led=data.get("led", False),
            hardware_reachable=True,
            latency_ms=round(latency, 2),
        )

    except httpx.ConnectError as e:
        print(f"❌ Erro de conexão com ESP32: {e}")
        return LedStatusResponse(
            led=False,
            hardware_reachable=False,
            latency_ms=None,
        )
    except httpx.TimeoutException:
        print("❌ Timeout na resposta do ESP32")
        return LedStatusResponse(
            led=False,
            hardware_reachable=False,
            latency_ms=None,
        )
    except Exception as e:
        print(f"❌ Erro inesperado no status: {e}")
        return LedStatusResponse(
            led=False,
            hardware_reachable=False,
            latency_ms=None,
        )


@router.post("/led/toggle", response_model=ToggleResponse)
async def toggle_led(command: LedCommand, request: Request):
    """Send ON/OFF command to ESP32 LED."""
    if command.state not in ("on", "off"):
        raise HTTPException(
            status_code=400,
            detail="Invalid state. Use 'on' or 'off'.",
        )

    client: httpx.AsyncClient = request.app.state.http_client

    try:
        start = time.perf_counter()
        response = await client.post(
            "/led",
            json={"state": command.state},
        )
        latency = (time.perf_counter() - start) * 1000

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"ESP32 returned status {response.status_code}",
            )

        data = response.json()
        return ToggleResponse(
            led=data.get("led", False),
            success=data.get("success", False),
            hardware_reachable=True,
            latency_ms=round(latency, 2),
        )

    except httpx.ConnectError as e:
        print(f"❌ Erro de conexão no toggle: {e}")
        raise HTTPException(
            status_code=503,
            detail="ESP32 is not reachable. Check network connection.",
        )
    except httpx.TimeoutException:
        print("❌ Timeout no comando toggle")
        raise HTTPException(
            status_code=504,
            detail="ESP32 request timed out.",
        )
    except Exception as e:
        print(f"❌ Erro inesperado no toggle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/{hardware_id}", response_model=SyncResponse)
async def sync_dispenser(hardware_id: str, db: Session = Depends(get_db)):
    """
    O dispenser baixa a tabela de horários e a configuração dos slots para funcionar offline.
    """
    schedules = crud_schedule.get_schedules(db, dispenser_id=hardware_id)
    
    slot_configs = []
    for sched in schedules:
        if sched.is_active is False:
            continue
        time_val = sched.time_legacy or ""
        if sched.scheduled_at:
            time_val = sched.scheduled_at.strftime("%H:%M")
        slot_configs.append(SlotConfig(
            slot_id=sched.slot_id or 0,
            time=time_val,
        ))
        
    return SyncResponse(
        dispenser_id=hardware_id,
        schedules=slot_configs
    )


@router.post("/event", response_model=IotEventResponse)
async def process_iot_event(
    event: IotEventCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    O hardware avisa ao servidor que um comprimido foi liberado ou que o paciente não confirmou a ingestão.
    """
    # Resolve slot_id from the Schedule so the dashboard can color the slot
    slot_id = None
    if event.schedule_id and event.schedule_id not in ("unknown", ""):
        try:
            sched_uuid = uuid.UUID(event.schedule_id)
            schedule = db.query(Schedule).filter(Schedule.id == sched_uuid).first()
            if schedule:
                slot_id = schedule.slot_id
        except (ValueError, AttributeError):
            pass

    log_data = {
        "schedule_id": event.schedule_id or "unknown",
        "patient_id": event.patient_id or "unknown",
        "dispenser_id": event.dispenser_id,
        "success": event.success,
        "error_message": event.error_message,
        "slot_id": slot_id,
    }
    
    # Update the existing dispatched log in-place, or create a new one if not found
    dispatched = (
        db.query(DispensationLog)
        .filter(DispensationLog.dispenser_id_legacy == event.dispenser_id)
        .filter(DispensationLog.status == "dispatched")
        .order_by(DispensationLog.actual_execution_time.desc())
        .first()
    )
    if dispatched:
        dispatched.success = event.success
        dispatched.status = None  # clear "dispatched" — resolveStatus uses success field
        dispatched.error_message = event.error_message
        dispatched.actual_execution_time = datetime.datetime.utcnow()
        db.commit()
        db.refresh(dispatched)
        created_log = dispatched
    else:
        created_log = crud_log.create_dispensation_log(db, log_data)
    
    patient = _resolve_patient_for_log(
        db,
        patient_id=event.patient_id,
        dispenser_id=event.dispenser_id,
    )
        
    schedule_for_notification = None
    if event.schedule_id and event.schedule_id not in ("unknown", ""):
        try:
            schedule_for_notification = (
                db.query(Schedule)
                .filter(Schedule.id == uuid.UUID(event.schedule_id))
                .first()
            )
        except ValueError:
            pass

    medication_name = _resolve_medication_name(
        db,
        medication_id=event.medication_id,
        schedule=schedule_for_notification,
        fallback=created_log.medication_name_snapshot,
    )
    if not created_log.medication_name_snapshot:
        created_log.medication_name_snapshot = medication_name
        db.commit()
        db.refresh(created_log)
    period = event.period or (schedule_for_notification.period if schedule_for_notification else None)

    _enqueue_dispensation_notification(
        background_tasks=background_tasks,
        db=db,
        log=created_log,
        patient=patient,
        medication_name=medication_name,
        period=period,
    )
    
    return IotEventResponse(
        message=f"Event '{event.event_type}' processed successfully.",
        log_id=str(created_log.id)
    )


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def process_heartbeat(
    heartbeat: HeartbeatCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    O hardware avisa que ainda está ligado e conectado ao Wi-Fi.
    """
    # 1. Fetch previous dispenser details to check for changes and trigger email notifications
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == heartbeat.dispenser_id).first()
    if dispenser:
        prev_critical = dispenser.critical_stock or False

        patient = None
        if dispenser.patient_id:
            patient = db.query(Patient).filter(Patient.id == dispenser.patient_id).first()
            
        if patient and patient.caregiver_username:
            caregiver_user = db.query(User).filter(User.username == patient.caregiver_username).first()
            if caregiver_user and caregiver_user.notifications_enabled and caregiver_user.email:
                patient_name = patient.full_name or patient.name or "Paciente"
                
                # Check for critical stock transition (from False to True)
                if not prev_critical and heartbeat.critical_stock:
                    html_body = get_critical_stock_template(
                        patient_name=patient_name,
                        hardware_id=heartbeat.dispenser_id
                    )
                    background_tasks.add_task(
                        send_email_notification,
                        to_email=caregiver_user.email,
                        subject=f"📦 Alerta SmartDispenser: Estoque crítico para {patient_name}",
                        html_body=html_body
                    )

    crud_command_queue.expire_stale_delivered(db, COMMAND_ACK_TIMEOUT_SECONDS)

    ack_command = None
    if heartbeat.command_ack:
        try:
            ack_id = uuid.UUID(heartbeat.command_ack.command_id)
            ack_command = crud_command_queue.process_command_ack(
                db,
                ack_id,
                heartbeat.command_ack.success,
                heartbeat.command_ack.error,
            )
            if ack_command and ack_command.command_type == "dispense":
                log = record_schedule_dispensation_log(
                    db,
                    ack_command,
                    heartbeat.command_ack.success,
                    heartbeat.command_ack.error,
                )
                schedule = _schedule_from_log(db, log)
                patient = _resolve_patient_for_log(
                    db,
                    patient_id=log.patient_id_legacy,
                    dispenser_id=ack_command.hardware_id,
                )
                medication_name = _resolve_medication_name(
                    db,
                    medication_id=log.medication_id_legacy,
                    schedule=schedule,
                    fallback=log.medication_name_snapshot,
                )
                period = ack_command.period or (schedule.period if schedule else None)
                _enqueue_dispensation_notification(
                    background_tasks=background_tasks,
                    db=db,
                    log=log,
                    patient=patient,
                    medication_name=medication_name,
                    period=period,
                )
        except ValueError:
            pass

    current_slot = heartbeat.current_slot
    if ack_command and heartbeat.command_ack:
        if heartbeat.command_ack.success:
            if ack_command.command_type == "dispense" and ack_command.expected_slot is not None:
                current_slot = ack_command.expected_slot
            elif ack_command.command_type == "calibrate":
                current_slot = 0
        elif heartbeat.command_ack.error == "slot_mismatch" and heartbeat.current_slot is not None:
            current_slot = heartbeat.current_slot

    status_data = {
        "dispenser_id": heartbeat.dispenser_id,
        "online": heartbeat.online,
        "critical_stock": heartbeat.critical_stock,
        "ip_address": heartbeat.ip_address,
        "current_slot": current_slot,
        "awaiting_confirm": heartbeat.awaiting_confirm,
    }

    crud_dispenser.update_dispenser_status(db, heartbeat.dispenser_id, status_data)

    pending = crud_command_queue.get_command_for_delivery(db, heartbeat.dispenser_id)
    command_public = None
    if pending:
        if pending.command_type == "dispense" and pending.expected_slot is not None:
            live = (
                db.query(Dispenser)
                .filter(Dispenser.hardware_id == heartbeat.dispenser_id)
                .first()
            )
            live_slot = (
                live.current_slot
                if live and live.current_slot is not None
                else heartbeat.current_slot
            )
            if live_slot is not None:
                corrected = carousel_slot_after_sequential(
                    int(live_slot), TOTAL_CAROUSEL_SLOTS
                )
                if corrected != pending.expected_slot:
                    pending.expected_slot = corrected
                    db.commit()
                    db.refresh(pending)
        if pending.status == "pending":
            crud_command_queue.mark_delivered(db, pending)
        command_public = PendingCommandPublic(
            id=str(pending.id),
            type=pending.command_type,
            period=pending.period,
            expected_slot=pending.expected_slot,
            silent_mode=bool(pending.silent_mode),
        )

    refill_mode = False
    if dispenser and dispenser.is_refilling:
        refill_mode = True

    return HeartbeatResponse(
        message="Heartbeat recorded successfully.",
        command=command_public,
        refill_mode=refill_mode,
    )


# Legacy router for IoT paths called by ESP32 firmware directly
legacy_router = APIRouter(prefix="/iot", tags=["iot"])

@legacy_router.post("/heartbeat", response_model=HeartbeatResponse)
async def process_legacy_heartbeat(
    heartbeat: HeartbeatCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Legacy endpoint for ESP32 firmware heartbeat at /iot/heartbeat.
    """
    return await process_heartbeat(heartbeat, background_tasks, db)
