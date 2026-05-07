"""Patient-related Pydantic schemas."""

from typing import Optional, List
from pydantic import BaseModel


class PatientCreate(BaseModel):
    """Schema for creating a patient."""
    name: str
    age: Optional[int] = None
    condition: Optional[str] = None
    dispensers: Optional[List[str]] = []


class PatientUpdate(BaseModel):
    """Schema for updating a patient."""
    name: Optional[str] = None
    age: Optional[int] = None
    condition: Optional[str] = None
    dispensers: Optional[List[str]] = None


class PatientPublic(BaseModel):
    """Schema for public patient information."""
    id: str
    name: str
    age: Optional[int] = None
    condition: Optional[str] = None
    dispensers: List[str] = []
    caregiver_username: str
