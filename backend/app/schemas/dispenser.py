"""Dispenser-related Pydantic schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


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
    online: bool
    critical_stock: bool
    ip_address: Optional[str] = None


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
    critical_stock: bool
    last_sync: Optional[datetime] = None
    ip_address: Optional[str] = None


class DispenserDeletionBlockers(BaseModel):
    medications_in_slots: int = 0
    schedules: int = 0


class DispenserDeletionStatus(BaseModel):
    can_delete: bool
    blockers: DispenserDeletionBlockers
    message: str
    steps: List[str] = Field(default_factory=list)


class DispenserResetConfigurationResult(BaseModel):
    removed_medications: int = 0
    removed_schedules: int = 0
    message: str


class DispenserForgetWifiResult(BaseModel):
    success: bool
    message: str
    hardware_id: str
