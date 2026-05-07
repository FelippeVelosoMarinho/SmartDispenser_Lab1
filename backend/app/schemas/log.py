"""Log-related Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DispensationLogPublic(BaseModel):
    """Schema for dispensation history logs."""
    id: str
    schedule_id: str
    patient_id: str
    dispenser_id: str
    medication_id: str
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None


class RefillLogPublic(BaseModel):
    """Schema for refill history logs."""
    id: str
    dispenser_id: str
    slot_id: int
    medication_id: str
    quantity_added: int
    timestamp: datetime
    performed_by: str
