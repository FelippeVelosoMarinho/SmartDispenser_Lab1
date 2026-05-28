"""IoT/Hardware-related Pydantic schemas."""

from typing import Optional, List
from pydantic import BaseModel


class SlotConfig(BaseModel):
    """Schema for individual slot schedule configuration during sync."""
    slot_id: int
    time: str


class SyncResponse(BaseModel):
    """Response containing schedule and slot configuration for the hardware to operate offline."""
    dispenser_id: str
    schedules: List[SlotConfig]


class IotEventCreate(BaseModel):
    """Event sent by the hardware to the server (e.g. dispensed, missed)."""
    dispenser_id: str
    schedule_id: Optional[str] = None
    patient_id: Optional[str] = None
    event_type: str  # e.g., "dispensed", "missed"
    success: bool
    error_message: Optional[str] = None


class IotEventResponse(BaseModel):
    """Server response after processing an IoT event."""
    message: str
    log_id: Optional[str] = None


class HeartbeatCreate(BaseModel):
    """Heartbeat sent by the hardware indicating it's online and its battery status."""
    dispenser_id: str
    battery_level: float
    online: bool = True
    critical_stock: bool = False


class HeartbeatResponse(BaseModel):
    """Server response to a heartbeat."""
    message: str

class LedCommand(BaseModel):
    """Payload to toggle the LED."""

    state: str  # "on" or "off"


class LedStatusResponse(BaseModel):
    """Response from LED status query."""

    led: bool
    hardware_reachable: bool = True
    latency_ms: Optional[float] = None


class ToggleResponse(BaseModel):
    """Response after toggling the LED."""

    led: bool
    success: bool
    hardware_reachable: bool = True
    latency_ms: Optional[float] = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    esp32_ip: str
    esp32_reachable: bool
