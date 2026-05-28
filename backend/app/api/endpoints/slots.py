"""Slot endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import Dispenser, Drawer, Medication, Slot, SlotMedication
from app.schemas.slot import SlotUpdate, SlotMedicationCreate, SlotMedicationUpdate

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
    medications_list = []
    if slot.slot_medications:
        for sm in slot.slot_medications:
            medications_list.append({
                "medication": _format_medication(sm.medication),
                "quantity": sm.quantity
            })

    return {
        "id": str(slot.id),
        "drawer_id": str(slot.drawer_id),
        "slot_number": slot.position_number,
        "max_pill_capacity": int(slot.max_pill_capacity or 0),
        "medications": medications_list,
    }

def _get_slot_or_404(db: Session, slot_id: int, username: str) -> Slot:
    slot = (
        db.query(Slot)
        .options(
            joinedload(Slot.slot_medications).joinedload(SlotMedication.medication),
            joinedload(Slot.drawer).joinedload(Drawer.dispenser).joinedload(Dispenser.patient)
        )
        .filter(Slot.id == slot_id)
        .first()
    )

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    dispenser = slot.drawer.dispenser if slot.drawer else None
    patient = dispenser.patient if dispenser else None
    if not dispenser or not patient or patient.caregiver_username != username:
        raise HTTPException(status_code=403, detail="Not authorized to access this slot")
        
    return slot

@router.patch("/{slot_id}")
async def update_slot(
    slot_id: int,
    slot_in: SlotUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a slot's basic properties."""
    slot = _get_slot_or_404(db, slot_id, current_user.username)
    if slot_in.max_pill_capacity is not None:
        slot.max_pill_capacity = slot_in.max_pill_capacity

    db.commit()
    db.refresh(slot)
    return _format_slot(slot)

@router.post("/{slot_id}/medications")
async def add_slot_medication(
    slot_id: int,
    med_in: SlotMedicationCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a medication to a slot."""
    slot = _get_slot_or_404(db, slot_id, current_user.username)
    
    medication = db.query(Medication).filter(Medication.id == med_in.medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
        
    sm = db.query(SlotMedication).filter(SlotMedication.slot_id == slot_id, SlotMedication.medication_id == medication.id).first()
    if sm:
        sm.quantity += med_in.quantity
    else:
        sm = SlotMedication(slot_id=slot_id, medication_id=medication.id, quantity=med_in.quantity)
        db.add(sm)
        
    db.commit()
    db.refresh(slot)
    return _format_slot(slot)

@router.patch("/{slot_id}/medications/{medication_id}")
async def update_slot_medication(
    slot_id: int,
    medication_id: int,
    med_in: SlotMedicationUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a medication quantity in a slot."""
    slot = _get_slot_or_404(db, slot_id, current_user.username)
    
    sm = db.query(SlotMedication).filter(SlotMedication.slot_id == slot_id, SlotMedication.medication_id == medication_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Medication not found in this slot")
        
    sm.quantity = med_in.quantity
    db.commit()
    db.refresh(slot)
    return _format_slot(slot)

@router.delete("/{slot_id}/medications/{medication_id}")
async def remove_slot_medication(
    slot_id: int,
    medication_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a medication from a slot."""
    slot = _get_slot_or_404(db, slot_id, current_user.username)
    
    sm = db.query(SlotMedication).filter(SlotMedication.slot_id == slot_id, SlotMedication.medication_id == medication_id).first()
    if not sm:
        raise HTTPException(status_code=404, detail="Medication not found in this slot")
        
    db.delete(sm)
    db.commit()
    db.refresh(slot)
    return _format_slot(slot)