"""Medication-related Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel


class MedicationCreate(BaseModel):
    """Schema for creating a medication."""
    name: str
    description: Optional[str] = None
    dosage: Optional[str] = None


class MedicationPublic(BaseModel):
    """Schema for public medication information."""
    id: str
    name: str
    description: Optional[str] = None
    dosage: Optional[str] = None
