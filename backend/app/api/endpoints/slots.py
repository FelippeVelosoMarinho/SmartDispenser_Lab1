"""Slot endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import Dispenser, Drawer, Medication, Slot
from app.schemas.slot import SlotUpdate

router = APIRouter(prefix="/api/slots", tags=["slots"])


def _format_medication(medication: Medication | None) -> dict | None:
    if not medication:
        return None

    return {
        "id": str(medication.id),
        "name": medication.name,
        "dosage": medication.dosage,
        "description": medication.description,
    }


def _format_slot(slot: Slot) -> dict:
    return {
        "id": str(slot.id),
        "drawer_id": str(slot.drawer_id),
        "slot_number": slot.position_number,
        "medication_id": str(slot.medication_id) if slot.medication_id else None,
        "medication": _format_medication(slot.medication),
        "current_pill_count": int(slot.current_pill_count or 0),
        "max_pill_capacity": int(slot.max_pill_capacity or 0),
    }


@router.patch("/{slot_id}")
async def update_slot(
    slot_id: int,
    slot_in: SlotUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a slot medication assignment and stock values."""
    slot = (
        db.query(Slot)
        .options(joinedload(Slot.medication), joinedload(Slot.drawer).joinedload(Drawer.dispenser).joinedload(Dispenser.patient))
        .filter(Slot.id == slot_id)
        .first()
    )

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    dispenser = slot.drawer.dispenser if slot.drawer else None
    patient = dispenser.patient if dispenser else None
    if not dispenser or not patient or patient.caregiver_username != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to update this slot")

    if slot_in.medication_id is not None:
        medication = db.query(Medication).filter(Medication.id == slot_in.medication_id).first()
        if not medication:
            raise HTTPException(status_code=404, detail="Medication not found")
        slot.medication_id = medication.id

    if slot_in.current_pill_count is not None:
        slot.current_pill_count = slot_in.current_pill_count

    if slot_in.max_pill_capacity is not None:
        slot.max_pill_capacity = slot_in.max_pill_capacity

    db.commit()
    db.refresh(slot)
    return _format_slot(slot)