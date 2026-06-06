"""Schedule-related Pydantic schemas."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

PeriodName = Literal["morning", "afternoon", "night"]


class ScheduleCreate(BaseModel):
    """Schema for creating a schedule (legacy position-based)."""
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
    slot_id: int = 0
    period: Optional[str] = None
    time: str
    scheduled_at: Optional[str] = None
    is_active: bool = True


class PeriodSchedulePut(BaseModel):
    """Upsert the three daily period times for a dispenser."""
    patient_id: str
    morning_time: str = Field(..., description="HH:MM")
    afternoon_time: str = Field(..., description="HH:MM")
    night_time: str = Field(..., description="HH:MM")
    is_active: bool = True


class PeriodSchedulePublic(BaseModel):
    """Current period schedule for a dispenser."""
    dispenser_id: str
    patient_id: str
    morning_time: str
    afternoon_time: str
    night_time: str
    is_active: bool = True
    source: str = "database"  # database | defaults
