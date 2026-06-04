"""Schedule-related Pydantic schemas."""

from typing import Optional

from pydantic import BaseModel


class ScheduleCreate(BaseModel):
    """Schema for creating a schedule."""
    patient_id: str
    dispenser_id: str
    slot_id: int
    time: str
    is_active: bool = True


class ScheduleUpdate(BaseModel):
    """Schema for partial schedule updates."""
    slot_id: Optional[int] = None
    time: Optional[str] = None
    is_active: Optional[bool] = None
    dispenser_id: Optional[str] = None


class SchedulePublic(BaseModel):
    """Schema for public schedule information."""
    id: str
    patient_id: str
    dispenser_id: str
    slot_id: int
    time: str
    scheduled_at: Optional[str] = None
    is_active: bool = True
