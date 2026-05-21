"""Log CRUD operations (database store)."""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.domain import DispensationLog, RefillHistory


def create_dispensation_log(db: Session, data: dict) -> DispensationLog:
    """Create a new dispensation log."""
    log = DispensationLog(
        schedule_id_legacy=data.get("schedule_id"),
        patient_id_legacy=data.get("patient_id"),
        dispenser_id_legacy=data.get("dispenser_id"),
        medication_id_legacy=data.get("medication_id"),
        actual_execution_time=data.get("timestamp", datetime.now()),
        success=data.get("success"),
        error_message=data.get("error_message")
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_dispensation_logs(db: Session, patient_id: Optional[str] = None, dispenser_id: Optional[str] = None) -> List[DispensationLog]:
    """Get dispensation logs, optionally filtering by patient or dispenser."""
    query = db.query(DispensationLog)
    if patient_id:
        query = query.filter(DispensationLog.patient_id_legacy == patient_id)
    if dispenser_id:
        query = query.filter(DispensationLog.dispenser_id_legacy == dispenser_id)
    return query.all()


def create_refill_log(db: Session, data: dict) -> RefillHistory:
    """Create a new refill log."""
    log = RefillHistory(
        dispenser_id_legacy=data.get("dispenser_id"),
        slot_id=data.get("slot_id"),
        medication_id_legacy=data.get("medication_id"),
        quantity_added=data.get("quantity_added", 0),
        created_at=data.get("timestamp", datetime.now()),
        performed_by_legacy=data.get("performed_by"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_refill_logs(db: Session, dispenser_id: Optional[str] = None) -> List[RefillHistory]:
    """Get refill logs, optionally filtering by dispenser."""
    query = db.query(RefillHistory)
    if dispenser_id:
        query = query.filter(RefillHistory.dispenser_id_legacy == dispenser_id)
    return query.all()
