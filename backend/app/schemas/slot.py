"""Slot-related Pydantic schemas."""

from typing import Optional

from pydantic import BaseModel


class SlotUpdate(BaseModel):
    """Schema for updating a slot's basic properties."""
    max_pill_capacity: Optional[int] = None

class SlotMedicationCreate(BaseModel):
    """Schema for adding a medication to a slot."""
    medication_id: str
    quantity: int

class SlotMedicationUpdate(BaseModel):
    """Schema for updating a medication's quantity in a slot."""
    quantity: int