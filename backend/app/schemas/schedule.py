"""Schedule-related Pydantic schemas."""

from pydantic import BaseModel


class ScheduleCreate(BaseModel):
    """Schema for creating a schedule."""
    patient_id: str
    dispenser_id: str
    medication_id: str
    slot_id: int
    time: str  # Format: "HH:MM"
    quantity: int


class SchedulePublic(BaseModel):
    """Schema for public schedule information."""
    id: str
    patient_id: str
    dispenser_id: str
    medication_id: str
    slot_id: int
    time: str
    quantity: int
