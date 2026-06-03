"""Dispensation scheduler — fires POST /dispense on the ESP at scheduled times.

Loop runs every 30 s so a server that starts mid-minute still catches the window.
Deduplication uses Schedule.last_triggered_at persisted in the DB, so a restart
within the same minute does not double-fire.
"""

import asyncio
import datetime
import logging

import httpx
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.domain import Dispenser, DispensationLog, Schedule

logger = logging.getLogger(__name__)

_DISPENSE_TIMEOUT = 8.0  # seconds
_POLL_INTERVAL = 30      # seconds — checks twice per minute


def _map_period(hour: int) -> str:
    """Map hour-of-day to the period string the ESP firmware expects."""
    if 6 <= hour < 12:
        return "morning"
    if 12 <= hour < 18:
        return "afternoon"
    return "night"


async def _call_dispense(ip: str, period: str) -> bool:
    """POST /dispense to the ESP. Returns True only on HTTP 200."""
    url = f"http://{ip}/dispense"
    try:
        async with httpx.AsyncClient(timeout=_DISPENSE_TIMEOUT) as client:
            resp = await client.post(url, json={"period": period, "silent_mode": False})
        if resp.status_code == 200:
            return True
        logger.warning("[Scheduler] ESP at %s returned HTTP %s", ip, resp.status_code)
        return False
    except httpx.ConnectError as exc:
        logger.warning("[Scheduler] Cannot reach dispenser at %s: %s", ip, exc)
        return False
    except httpx.TimeoutException:
        logger.warning("[Scheduler] Timeout calling dispenser at %s", ip)
        return False


def _record_log(db: Session, schedule: Schedule, success: bool, error: str | None) -> None:
    log = DispensationLog(
        schedule_id_legacy=str(schedule.id),
        patient_id_legacy=str(schedule.patient_id) if schedule.patient_id else None,
        dispenser_id_legacy=schedule.dispenser_id,
        actual_execution_time=datetime.datetime.utcnow(),
        success=success,
        error_message=error,
    )
    db.add(log)


async def _process_schedule(db: Session, schedule: Schedule, now: datetime.datetime) -> None:
    period = _map_period(now.hour)

    dispenser: Dispenser | None = None
    if schedule.dispenser_id:
        dispenser = (
            db.query(Dispenser)
            .filter(Dispenser.hardware_id == schedule.dispenser_id)
            .first()
        )

    # Mark as triggered before the network call so a crash mid-flight
    # doesn't cause a second attempt in the same minute.
    schedule.last_triggered_at = now
    db.commit()

    if not dispenser:
        logger.warning("[Scheduler] Schedule %s: dispenser '%s' not in DB — skipped",
                       schedule.id, schedule.dispenser_id)
        _record_log(db, schedule, False, "dispenser not found in DB")
        db.commit()
        return

    if not dispenser.ip_address:
        logger.warning("[Scheduler] Dispenser %s has no IP yet (no heartbeat) — skipped",
                       dispenser.hardware_id)
        _record_log(db, schedule, False, "no ip_address on record — heartbeat not received")
        db.commit()
        return

    logger.info("[Scheduler] → %s @ %s  schedule=%s  period=%s",
                dispenser.hardware_id, dispenser.ip_address, schedule.id, period)

    success = await _call_dispense(dispenser.ip_address, period)
    error = None if success else "ESP /dispense returned non-200 or timed out"
    _record_log(db, schedule, success, error)
    db.commit()

    if success:
        logger.info("[Scheduler] ✅ Dispensed — dispenser %s", dispenser.hardware_id)
    else:
        logger.error("[Scheduler] ❌ Dispense failed — dispenser %s", dispenser.hardware_id)


async def run_dispense_scheduler() -> None:
    """Async background task: poll DB every 30 s and fire due schedules."""
    logger.info("[Scheduler] Started — polling every %d s", _POLL_INTERVAL)

    while True:
        try:
            now = datetime.datetime.now()
            current_hhmm = now.strftime("%H:%M")
            # A schedule triggered within the last 90 s is considered done for this minute.
            dedup_cutoff = now - datetime.timedelta(seconds=90)

            db: Session = SessionLocal()
            try:
                due = (
                    db.query(Schedule)
                    .filter(
                        Schedule.is_active == True,  # noqa: E712
                        Schedule.time_legacy == current_hhmm,
                        or_(
                            Schedule.last_triggered_at == None,  # noqa: E711
                            Schedule.last_triggered_at < dedup_cutoff,
                        ),
                    )
                    .all()
                )

                if due:
                    logger.info("[Scheduler] %d schedule(s) due at %s", len(due), current_hhmm)

                for schedule in due:
                    await _process_schedule(db, schedule, now)
            finally:
                db.close()

        except Exception:
            logger.exception("[Scheduler] Unexpected error — loop continues")

        await asyncio.sleep(_POLL_INTERVAL)
