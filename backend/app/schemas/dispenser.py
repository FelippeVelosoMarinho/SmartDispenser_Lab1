"""Dispenser-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DiscoveredDispenser(BaseModel):
    """Schema for discovered/available dispenser during pairing."""

    id: str
    serial: str
    mac: str
    rssi: int
    firmware: str


class DispenserStatusPublic(BaseModel):
    """Schema for dispenser telemetry status."""
    dispenser_id: str
    battery_level: float
    online: bool
    critical_stock: bool


class DispenserPairRequest(BaseModel):
    """Schema for pairing a dispenser with a patient."""

    patient_id: str


class DispenserPublic(BaseModel):
    """Schema for public dispenser information."""

    id: str
    hardware_id: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    is_online: bool
    battery_level: float
    critical_stock: bool
    last_sync: Optional[datetime] = None
