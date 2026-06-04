"""Dispensation scheduler — fires POST /dispense on the ESP at scheduled times.

Matches schedules by full scheduled_at (±30 s). Validates carousel position via
GET /status before dispensing. Processes due schedules in position_number order.
"""

import asyncio
import datetime
import logging
from typing import Any

import httpx
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.domain import DispensationLog, Dispenser, Schedule, Slot
from app.services.schedule_utils import (
    carousel_slot_after_dispense,
    carousel_slot_before_dispense,
)

logger = logging.getLogger(__name__)

_DISPENSE_TIMEOUT = 8.0
_STATUS_TIMEOUT = 5.0
_POLL_INTERVAL = 30
_DUE_WINDOW_SECONDS = 30
_DEDUP_SECONDS = 90


def _map_period(hour: int) -> str:
    if 6 <= hour < 12:
        return "morning"
    if 12 <= hour < 18:
        return "afternoon"
    return "night"


def _effective_scheduled_at(schedule: Schedule) -> datetime.datetime | None:
    if schedule.scheduled_at:
        return schedule.scheduled_at
    if schedule.time_legacy and "T" in schedule.time_legacy:
        try:
            raw = schedule.time_legacy
            if len(raw) == 16:
                raw = raw + ":00"
            return datetime.datetime.fromisoformat(raw)
        except ValueError:
            return None
    if schedule.time_legacy and len(schedule.time_legacy) == 5:
        try:
            hour, minute = int(schedule.time_legacy[:2]), int(schedule.time_legacy[3:5])
            now = datetime.datetime.now()
            return now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        except ValueError:
            return None
    return None


def _is_due(schedule: Schedule, now: datetime.datetime, dedup_cutoff: datetime.datetime) -> bool:
    if not schedule.is_active:
        return False
    if schedule.last_triggered_at and schedule.last_triggered_at >= dedup_cutoff:
        return False

    scheduled_at = _effective_scheduled_at(schedule)
    if not scheduled_at:
        return False

    delta = abs((now - scheduled_at).total_seconds())
    return delta <= _DUE_WINDOW_SECONDS


async def _get_status(ip: str) -> dict[str, Any] | None:
    url = f"http://{ip}/status"
    try:
        async with httpx.AsyncClient(timeout=_STATUS_TIMEOUT) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            return resp.json()
        logger.warning("[Scheduler] GET /status at %s returned HTTP %s", ip, resp.status_code)
        return None
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        logger.warning("[Scheduler] Cannot reach %s for status: %s", ip, exc)
        return None


async def _call_dispense(ip: str, period: str, expected_slot: int | None) -> tuple[bool, str | None]:
    url = f"http://{ip}/dispense"
    body: dict[str, Any] = {"period": period, "silent_mode": False}
    if expected_slot is not None:
        body["expected_slot"] = expected_slot
    try:
        async with httpx.AsyncClient(timeout=_DISPENSE_TIMEOUT) as client:
            resp = await client.post(url, json=body)
        if resp.status_code == 200:
            return True, None
        detail = resp.text[:200] if resp.text else f"HTTP {resp.status_code}"
        logger.warning("[Scheduler] ESP at %s returned HTTP %s: %s", ip, resp.status_code, detail)
        return False, detail
    except httpx.ConnectError as exc:
        logger.warning("[Scheduler] Cannot reach dispenser at %s: %s", ip, exc)
        return False, str(exc)
    except httpx.TimeoutException:
        logger.warning("[Scheduler] Timeout calling dispenser at %s", ip)
        return False, "timeout"


def _record_log(
    db: Session,
    schedule: Schedule,
    success: bool,
    error: str | None,
    slot_id: int | None = None,
) -> None:
    log = DispensationLog(
        schedule_id_legacy=str(schedule.id),
        patient_id_legacy=str(schedule.patient_id) if schedule.patient_id else None,
        dispenser_id_legacy=schedule.dispenser_id,
        slot_id=slot_id,
        actual_execution_time=datetime.datetime.utcnow(),
        success=success,
        error_message=error,
    )
    db.add(log)


def _position_for_schedule(db: Session, schedule: Schedule) -> int | None:
    if not schedule.slot_id:
        return None
    slot = db.query(Slot).filter(Slot.id == schedule.slot_id).first()
    return slot.position_number if slot else None


async def _process_schedule(db: Session, schedule: Schedule, now: datetime.datetime) -> None:
    position = _position_for_schedule(db, schedule)
    period = _map_period(now.hour)

    dispenser: Dispenser | None = None
    if schedule.dispenser_id:
        dispenser = (
            db.query(Dispenser)
            .filter(Dispenser.hardware_id == schedule.dispenser_id)
            .first()
        )

    schedule.last_triggered_at = now
    db.commit()

    if not dispenser:
        logger.warning(
            "[Scheduler] Schedule %s: dispenser '%s' not in DB — skipped",
            schedule.id,
            schedule.dispenser_id,
        )
        _record_log(db, schedule, False, "dispenser not found in DB", schedule.slot_id)
        db.commit()
        return

    if not dispenser.ip_address:
        logger.warning(
            "[Scheduler] Dispenser %s has no IP yet (no heartbeat) — skipped",
            dispenser.hardware_id,
        )
        _record_log(db, schedule, False, "no ip_address — heartbeat not received", schedule.slot_id)
        db.commit()
        return

    if position is None:
        _record_log(db, schedule, False, "slot not found for schedule", schedule.slot_id)
        db.commit()
        return

    status = await _get_status(dispenser.ip_address)
    if status is None:
        _record_log(db, schedule, False, "could not read ESP /status", schedule.slot_id)
        db.commit()
        return

    if status.get("awaiting_confirm") in (True, "true"):
        logger.warning(
            "[Scheduler] Dispenser %s awaiting confirmation — skipped schedule %s",
            dispenser.hardware_id,
            schedule.id,
        )
        _record_log(db, schedule, False, "awaiting_confirm on dispenser", schedule.slot_id)
        db.commit()
        return

    current_slot = int(status.get("current_slot", -1))
    expected_before = carousel_slot_before_dispense(position)
    if current_slot != expected_before:
        msg = (
            f"carousel mismatch: current_slot={current_slot}, "
            f"expected_before_dispense={expected_before} for position {position}"
        )
        logger.error("[Scheduler] %s — schedule %s", msg, schedule.id)
        _record_log(db, schedule, False, msg, schedule.slot_id)
        db.commit()
        return

    expected_after = carousel_slot_after_dispense(position)
    logger.info(
        "[Scheduler] → %s @ %s  schedule=%s  position=%s  period=%s",
        dispenser.hardware_id,
        dispenser.ip_address,
        schedule.id,
        position,
        period,
    )

    success, err_detail = await _call_dispense(
        dispenser.ip_address, period, expected_after
    )
    error = None if success else (err_detail or "ESP /dispense failed")
    _record_log(db, schedule, success, error, schedule.slot_id)
    db.commit()

    if success:
        logger.info("[Scheduler] ✅ Dispensed — dispenser %s position %s", dispenser.hardware_id, position)
    else:
        logger.error("[Scheduler] ❌ Dispense failed — dispenser %s", dispenser.hardware_id)


async def run_dispense_scheduler() -> None:
    """Async background task: poll DB every 30 s and fire due schedules."""
    logger.info("[Scheduler] Started — polling every %d s", _POLL_INTERVAL)

    while True:
        try:
            now = datetime.datetime.now()
            dedup_cutoff = now - datetime.timedelta(seconds=_DEDUP_SECONDS)

            db: Session = SessionLocal()
            try:
                candidates = (
                    db.query(Schedule)
                    .filter(Schedule.is_active == True)  # noqa: E712
                    .all()
                )
                due = [s for s in candidates if _is_due(s, now, dedup_cutoff)]
                due.sort(
                    key=lambda s: _position_for_schedule(db, s) or 999
                )

                if due:
                    logger.info("[Scheduler] %d schedule(s) due at %s", len(due), now.isoformat())

                for schedule in due:
                    await _process_schedule(db, schedule, now)
            finally:
                db.close()

        except Exception:
            logger.exception("[Scheduler] Unexpected error — loop continues")

        await asyncio.sleep(_POLL_INTERVAL)
