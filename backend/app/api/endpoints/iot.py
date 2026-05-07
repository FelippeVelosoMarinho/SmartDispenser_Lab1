"""IoT/Hardware endpoints."""

import time
import httpx
from fastapi import APIRouter, HTTPException, Request

from app.core.config import ESP32_BASE_URL
from app.crud import schedule as crud_schedule
from app.crud import log as crud_log
from app.crud import dispenser as crud_dispenser
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
async def sync_dispenser(hardware_id: str):
    """
    O dispenser baixa a tabela de horários e a configuração dos slots para funcionar offline.
    """
    schedules = crud_schedule.get_schedules(dispenser_id=hardware_id)
    
    slot_configs = []
    for sched in schedules:
        slot_configs.append(SlotConfig(
            slot_id=sched["slot_id"],
            medication_id=sched["medication_id"],
            quantity=sched["quantity"],
            time=sched["time"],
        ))
        
    return SyncResponse(
        dispenser_id=hardware_id,
        schedules=slot_configs
    )


@router.post("/event", response_model=IotEventResponse)
async def process_iot_event(event: IotEventCreate):
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
    created_log = crud_log.create_dispensation_log(log_data)
    
    return IotEventResponse(
        message=f"Event '{event.event_type}' processed successfully.",
        log_id=created_log["id"]
    )


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def process_heartbeat(heartbeat: HeartbeatCreate):
    """
    O hardware avisa que ainda está ligado e conectado ao Wi-Fi.
    """
    status_data = {
        "dispenser_id": heartbeat.dispenser_id,
        "battery_level": heartbeat.battery_level,
        "online": heartbeat.online,
        "critical_stock": heartbeat.critical_stock,
    }
    
    crud_dispenser.update_dispenser_status(heartbeat.dispenser_id, status_data)
    
    return HeartbeatResponse(
        message="Heartbeat recorded successfully."
    )
