"""Dispenser-related Pydantic schemas."""

from pydantic import BaseModel


class DispenserStatusPublic(BaseModel):
    """Schema for dispenser telemetry status."""
    dispenser_id: str
    battery_level: float
    online: bool
    critical_stock: bool
