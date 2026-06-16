"""Shared helpers for recording dispensation logs from scheduler ACKs."""

import datetime

from sqlalchemy.orm import Session

from app.models.domain import Dispenser, DispensationLog, Drawer, PendingCommand, Schedule, Slot


def record_schedule_dispensation_log(
    db: Session,
    command: PendingCommand,
    success: bool,
    error: str | None,
) -> DispensationLog:
    """Write a DispensationLog when the ESP ACKs a queued dispense command."""
    schedule: Schedule | None = None
    if command.schedule_id:
        schedule = db.query(Schedule).filter(Schedule.id == command.schedule_id).first()

    medication_name: str | None = None

    # Try to resolve medication from the schedule's slot_id
    if schedule and schedule.slot_id:
        slot = db.query(Slot).filter(Slot.id == schedule.slot_id).first()
        if slot and slot.slot_medications:
            first_med = slot.slot_medications[0].medication
            if first_med:
                medication_name = first_med.name

    # Fallback: resolve by physical slot number (expected_slot) via the dispenser's drawers
    if medication_name is None and command.expected_slot is not None:
        dispenser = (
            db.query(Dispenser)
            .filter(Dispenser.hardware_id == command.hardware_id)
            .first()
        )
        if dispenser:
            for drawer in dispenser.drawers:
                slot = (
                    db.query(Slot)
                    .filter(Slot.drawer_id == drawer.id)
                    .filter(Slot.position_number == command.expected_slot)
                    .first()
                )
                if slot and slot.slot_medications:
                    first_med = slot.slot_medications[0].medication
                    if first_med:
                        medication_name = first_med.name
                        break

    log = DispensationLog(
        schedule_id_legacy=str(command.schedule_id) if command.schedule_id else None,
        patient_id_legacy=str(schedule.patient_id) if schedule and schedule.patient_id else None,
        dispenser_id_legacy=command.hardware_id,
        slot_id=schedule.slot_id if schedule else None,
        medication_name_snapshot=medication_name,
        actual_execution_time=datetime.datetime.utcnow(),
        success=None,
        status="dispatched",
        error_message=error if not success else None,
    )
    db.add(log)

    if not success and schedule and error in ("slot_mismatch", "awaiting_confirm"):
        schedule.last_triggered_at = None

    db.commit()
    db.refresh(log)
    return log
