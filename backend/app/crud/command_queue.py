"""CRUD for pending hardware commands delivered via heartbeat."""

from __future__ import annotations

import datetime
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.domain import PendingCommand

ACTIVE_STATUSES = ("pending", "delivered")
TERMINAL_STATUSES = ("completed", "failed", "superseded")


def _existing_for_schedule(db: Session, schedule_id: uuid.UUID) -> Optional[PendingCommand]:
    return (
        db.query(PendingCommand)
        .filter(PendingCommand.schedule_id == schedule_id)
        .filter(PendingCommand.status.in_(ACTIVE_STATUSES))
        .first()
    )


def _existing_active_calibrate(db: Session, hardware_id: str) -> Optional[PendingCommand]:
    return (
        db.query(PendingCommand)
        .filter(PendingCommand.hardware_id == hardware_id)
        .filter(PendingCommand.command_type == "calibrate")
        .filter(PendingCommand.status.in_(ACTIVE_STATUSES))
        .first()
    )


def enqueue_calibrate(db: Session, hardware_id: str) -> PendingCommand:
    """Enqueue carousel calibration (start-cycle) for heartbeat delivery."""
    existing = _existing_active_calibrate(db, hardware_id)
    if existing:
        return existing

    command = PendingCommand(
        hardware_id=hardware_id,
        command_type="calibrate",
        status="pending",
    )
    db.add(command)
    db.commit()
    db.refresh(command)
    return command


def enqueue_dispense(
    db: Session,
    hardware_id: str,
    period: str,
    expected_slot: int,
    schedule_id: uuid.UUID,
    *,
    silent_mode: bool = False,
) -> PendingCommand:
    """Enqueue a dispense command; deduplicates by schedule_id while active."""
    existing = _existing_for_schedule(db, schedule_id)
    if existing:
        return existing

    command = PendingCommand(
        hardware_id=hardware_id,
        command_type="dispense",
        period=period,
        expected_slot=expected_slot,
        silent_mode=silent_mode,
        schedule_id=schedule_id,
        status="pending",
    )
    db.add(command)
    db.commit()
    db.refresh(command)
    return command


def get_command_for_delivery(db: Session, hardware_id: str) -> Optional[PendingCommand]:
    """Return oldest pending/delivered command for re-delivery (FIFO)."""
    return (
        db.query(PendingCommand)
        .filter(PendingCommand.hardware_id == hardware_id)
        .filter(PendingCommand.status.in_(ACTIVE_STATUSES))
        .order_by(PendingCommand.created_at.asc())
        .first()
    )


def mark_delivered(db: Session, command: PendingCommand) -> PendingCommand:
    if command.status == "pending":
        command.status = "delivered"
        command.delivered_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(command)
    return command


def process_command_ack(
    db: Session,
    command_id: uuid.UUID,
    success: bool,
    error: Optional[str] = None,
) -> Optional[PendingCommand]:
    command = db.query(PendingCommand).filter(PendingCommand.id == command_id).first()
    if not command:
        return None
    if command.status in TERMINAL_STATUSES:
        return command

    command.completed_at = datetime.datetime.utcnow()
    if success:
        command.status = "completed"
        command.error_message = None
    else:
        command.status = "failed"
        command.error_message = error
    db.commit()
    db.refresh(command)
    return command


def expire_stale_delivered(db: Session, max_age_seconds: int) -> int:
    """Mark delivered commands without ACK as failed after TTL. Returns count expired."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(seconds=max_age_seconds)
    stale = (
        db.query(PendingCommand)
        .filter(PendingCommand.status == "delivered")
        .filter(PendingCommand.delivered_at.isnot(None))
        .filter(PendingCommand.delivered_at < cutoff)
        .all()
    )
    for command in stale:
        command.status = "failed"
        command.error_message = "command ack timeout"
        command.completed_at = datetime.datetime.utcnow()
    if stale:
        db.commit()
    return len(stale)
