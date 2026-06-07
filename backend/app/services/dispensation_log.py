"""Shared helpers for recording dispensation logs from scheduler ACKs."""

import datetime

from sqlalchemy.orm import Session

from app.models.domain import DispensationLog, PendingCommand, Schedule


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

    log = DispensationLog(
        schedule_id_legacy=str(command.schedule_id) if command.schedule_id else None,
        patient_id_legacy=str(schedule.patient_id) if schedule and schedule.patient_id else None,
        dispenser_id_legacy=command.hardware_id,
        slot_id=None,
        actual_execution_time=datetime.datetime.utcnow(),
        success=success,
        error_message=error,
    )
    db.add(log)

    if not success and schedule and error in ("slot_mismatch", "awaiting_confirm"):
        schedule.last_triggered_at = None

    db.commit()
    db.refresh(log)
    return log
