"""Sync PatientMedication config → SlotMedication + Schedule on all patient dispensers."""

import json
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.crud.medication import get_or_create_medication
from app.models.domain import Drawer, Schedule, Slot, SlotMedication

if TYPE_CHECKING:
    from app.models.domain import Patient, PatientMedication

PERIOD_OFFSET = {"morning": 0, "afternoon": 1, "night": 2}


def day_period_to_slot(day: int, period: str) -> int:
    """Convert (day, period) to physical slot number 1–30.

    day: 0=Dia 1 … 9=Dia 10
    period: "morning" | "afternoon" | "night"
    """
    return day * 3 + PERIOD_OFFSET[period] + 1


def _parse_horarios(patient_medication: "PatientMedication") -> list[dict]:
    try:
        items = json.loads(patient_medication.horarios or "[]")
    except (ValueError, TypeError):
        return []
    if not items or not isinstance(items[0], dict):
        return []
    return items


def sync_patient_medication(
    db: Session, patient_medication: "PatientMedication", patient: "Patient"
) -> list[int]:
    """Configure SlotMedication + Schedule across ALL patient dispensers.

    Returns the sorted list of slot position_numbers that were configured.
    If the patient has no paired dispenser, returns [] without error.
    """
    if not patient.dispensers:
        return []

    items = _parse_horarios(patient_medication)
    if not items:
        return []

    medication = get_or_create_medication(
        db, patient_medication.nome, patient_medication.dosagem or ""
    )

    configured: set[int] = set()

    for dispenser in patient.dispensers:
        drawer = db.query(Drawer).filter(Drawer.dispenser_id == dispenser.id).first()
        if not drawer:
            continue

        for item in items:
            day = item.get("day")
            period = item.get("period")
            if day is None or period not in PERIOD_OFFSET:
                continue

            slot_num = day_period_to_slot(day, period)
            slot = (
                db.query(Slot)
                .filter(Slot.drawer_id == drawer.id, Slot.position_number == slot_num)
                .first()
            )
            if not slot:
                continue

            db.query(SlotMedication).filter(SlotMedication.slot_id == slot.id).delete(
                synchronize_session=False
            )
            db.query(Schedule).filter(
                Schedule.slot_id == slot.id,
                Schedule.patient_id == patient.id,
            ).delete(synchronize_session=False)

            db.add(SlotMedication(slot_id=slot.id, medication_id=medication.id, quantity=0))
            db.add(
                Schedule(
                    slot_id=slot.id,
                    patient_id=patient.id,
                    dispenser_id=dispenser.hardware_id,
                    period=period,
                    is_active=True,
                )
            )
            configured.add(slot_num)

    db.commit()
    return sorted(configured)


def unsync_patient_medication(
    db: Session, patient_medication: "PatientMedication", patient: "Patient"
) -> None:
    """Remove SlotMedication + Schedule from ALL patient dispensers for this medication."""
    if not patient.dispensers:
        return

    items = _parse_horarios(patient_medication)
    if not items:
        return

    for dispenser in patient.dispensers:
        drawer = db.query(Drawer).filter(Drawer.dispenser_id == dispenser.id).first()
        if not drawer:
            continue

        for item in items:
            day = item.get("day")
            period = item.get("period")
            if day is None or period not in PERIOD_OFFSET:
                continue

            slot_num = day_period_to_slot(day, period)
            slot = (
                db.query(Slot)
                .filter(Slot.drawer_id == drawer.id, Slot.position_number == slot_num)
                .first()
            )
            if not slot:
                continue

            db.query(SlotMedication).filter(SlotMedication.slot_id == slot.id).delete(
                synchronize_session=False
            )
            db.query(Schedule).filter(
                Schedule.slot_id == slot.id,
                Schedule.patient_id == patient.id,
            ).delete(synchronize_session=False)

    db.commit()
