"""Slot-related Pydantic schemas."""

from typing import Optional

from pydantic import BaseModel


class SlotUpdate(BaseModel):
    """Schema for updating a slot."""

    medication_id: Optional[int] = None
    current_pill_count: Optional[int] = None
    max_pill_capacity: Optional[int] = None