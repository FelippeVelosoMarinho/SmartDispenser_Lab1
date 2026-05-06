"""IoT/Hardware-related Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel


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
