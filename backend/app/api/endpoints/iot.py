"""IoT/Hardware endpoints."""

import time
import httpx
from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db

from app.core.config import ESP32_BASE_URL
from app.crud import schedule as crud_schedule
from app.crud import log as crud_log
from app.crud import dispenser as crud_dispenser
from app.models.domain import User, Patient, Dispenser, Medication
from app.services.notifier import send_email_notification
from app.services.templates import (
    get_dispensation_success_template,
    get_dispensation_failure_template,
    get_critical_stock_template,
    get_low_battery_template,
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
)

router = APIRouter(prefix="/api", tags=["iot"])


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
        slot_configs.append(SlotConfig(
            slot_id=sched.slot_id or 0,
            medication_id=str(sched.medication_id) if sched.medication_id else "",
            quantity=sched.pills_per_dose or 1,
            time=sched.time_legacy or "",
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
    log_data = {
        "schedule_id": event.schedule_id or "unknown",
        "patient_id": event.patient_id or "unknown",
        "dispenser_id": event.dispenser_id,
        "medication_id": event.medication_id or "unknown",
        "success": event.success,
        "error_message": event.error_message,
    }
    
    # Store the dispensation log using the crud operation
    created_log = crud_log.create_dispensation_log(db, log_data)
    
    # Resolve Patient
    patient = None
    if event.patient_id and event.patient_id != "unknown":
        try:
            from uuid import UUID
            patient_uuid = UUID(event.patient_id)
            patient = db.query(Patient).filter(Patient.id == patient_uuid).first()
        except ValueError:
            pass
            
    if not patient:
        # Fallback to looking up the patient by dispenser hardware_id
        dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == event.dispenser_id).first()
        if dispenser and dispenser.patient_id:
            patient = db.query(Patient).filter(Patient.id == dispenser.patient_id).first()
            
    # Resolve Caregiver User
    caregiver_user = None
    if patient and patient.caregiver_username:
        caregiver_user = db.query(User).filter(User.username == patient.caregiver_username).first()
        
    # Resolve Medication Name
    medication_name = "Medicamento"
    if event.medication_id and event.medication_id != "unknown":
        try:
            med_id = int(event.medication_id)
            medication = db.query(Medication).filter(Medication.id == med_id).first()
            if medication:
                medication_name = medication.name
        except ValueError:
            medication_name = event.medication_id
            
    # Trigger notifications if caregiver exists, has notifications enabled, and has an email
    if caregiver_user and caregiver_user.notifications_enabled and caregiver_user.email:
        patient_name = patient.full_name or patient.name or "Paciente"
        if event.success:
            html_body = get_dispensation_success_template(
                patient_name=patient_name,
                medication_name=medication_name,
                time_str=created_log.actual_execution_time.strftime("%d/%m/%Y %H:%M:%S")
            )
            background_tasks.add_task(
                send_email_notification,
                to_email=caregiver_user.email,
                subject=f"🟢 SmartDispenser: Ingestão de {patient_name} confirmada",
                html_body=html_body
            )
        else:
            html_body = get_dispensation_failure_template(
                patient_name=patient_name,
                medication_name=medication_name,
                scheduled_time="Dose programada",
                error_message=event.error_message or "Não confirmado pelo paciente"
            )
            background_tasks.add_task(
                send_email_notification,
                to_email=caregiver_user.email,
                subject=f"⚠️ Alerta SmartDispenser: Medicação NÃO confirmada para {patient_name}",
                html_body=html_body
            )
            
        # Update log to mark caregiver as notified
        created_log.caregiver_notified = True
        db.commit()
    
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
        prev_battery = float(dispenser.battery_level) if dispenser.battery_level is not None else 100.0
        
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
                    
                # Check for battery level drop (transitioning below 20.0%)
                if prev_battery >= 20.0 and heartbeat.battery_level < 20.0:
                    html_body = get_low_battery_template(
                        patient_name=patient_name,
                        hardware_id=heartbeat.dispenser_id,
                        battery_level=heartbeat.battery_level
                    )
                    background_tasks.add_task(
                        send_email_notification,
                        to_email=caregiver_user.email,
                        subject=f"🔋 Alerta SmartDispenser: Bateria baixa ({heartbeat.battery_level:.1f}%) para {patient_name}",
                        html_body=html_body
                    )

    # 2. Update dispenser status in DB
    status_data = {
        "dispenser_id": heartbeat.dispenser_id,
        "battery_level": heartbeat.battery_level,
        "online": heartbeat.online,
        "critical_stock": heartbeat.critical_stock,
    }
    
    crud_dispenser.update_dispenser_status(db, heartbeat.dispenser_id, status_data)
    
    return HeartbeatResponse(
        message="Heartbeat recorded successfully."
    )
