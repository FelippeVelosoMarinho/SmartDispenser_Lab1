"""Dispensation scheduler — enqueues dispense commands or pushes to ESP (LAN dev).

Period schedules (morning/afternoon/night) advance the carousel sequentially (+1 per
dispense). Legacy position-based schedules (no period field) are ignored.
"""

import asyncio
import datetime
import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import (
    SCHEDULER_AWAITING_CONFIRM_GRACE_SECONDS,
    SCHEDULER_DEDUP_SECONDS,
    SCHEDULER_DUE_WINDOW_SECONDS,
    SCHEDULER_EARLY_SLACK_SECONDS,
    SCHEDULER_IGNORE_AWAITING_CONFIRM,
    SCHEDULER_MODE,
    SCHEDULER_POLL_SECONDS,
    SCHEDULER_TIMEZONE,
    TOTAL_CAROUSEL_SLOTS,
    COMMAND_ACK_TIMEOUT_SECONDS,
)
from app.core.database import SessionLocal
from app.crud import command_queue as crud_command_queue
from app.models.domain import DispensationLog, Dispenser, Schedule
from app.services.schedule_utils import carousel_slot_after_sequential
from app.services.scheduler_clock import scheduler_now

logger = logging.getLogger(__name__)

_DISPENSE_TIMEOUT = 8.0
_STATUS_TIMEOUT = 5.0
_PERIOD_ORDER = {"morning": 0, "afternoon": 1, "night": 2}


def _effective_scheduled_at(schedule: Schedule) -> datetime.datetime | None:
    now = scheduler_now()

    # Period schedules (HH:MM) fire daily — use time_legacy, not stale scheduled_at from save day.
    if (
        schedule.period
        and schedule.time_legacy
        and len(schedule.time_legacy) == 5
        and schedule.time_legacy[2] == ":"
    ):
        try:
            hour, minute = int(schedule.time_legacy[:2]), int(schedule.time_legacy[3:5])
            return now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        except ValueError:
            pass

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
            now = scheduler_now()
            return now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        except ValueError:
            return None
    if schedule.scheduled_time:
        now = scheduler_now()
        return now.replace(
            hour=schedule.scheduled_time.hour,
            minute=schedule.scheduled_time.minute,
            second=0,
            microsecond=0,
        )
    return None


def _due_window_seconds(dispenser: Dispenser | None) -> int:
    """Late-side window after scheduled time (heartbeat delivery slack)."""
    return SCHEDULER_DUE_WINDOW_SECONDS


def _is_due(
    schedule: Schedule,
    now: datetime.datetime,
    dedup_cutoff: datetime.datetime,
    dispenser: Dispenser | None = None,
) -> bool:
    if not schedule.is_active:
        return False
    if not schedule.period:
        return False
    if schedule.last_triggered_at and schedule.last_triggered_at >= dedup_cutoff:
        return False

    scheduled_at = _effective_scheduled_at(schedule)
    if not scheduled_at:
        return False

    signed = (now - scheduled_at).total_seconds()
    late_window = _due_window_seconds(dispenser)

    if signed < -SCHEDULER_EARLY_SLACK_SECONDS:
        return False
    if signed <= late_window:
        return True
    if dispenser and dispenser.awaiting_confirm:
        return signed <= SCHEDULER_AWAITING_CONFIRM_GRACE_SECONDS
    return False


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
) -> None:
    log = DispensationLog(
        schedule_id_legacy=str(schedule.id),
        patient_id_legacy=str(schedule.patient_id) if schedule.patient_id else None,
        dispenser_id_legacy=schedule.dispenser_id,
        slot_id=None,
        actual_execution_time=datetime.datetime.utcnow(),
        success=success,
        error_message=error,
    )
    db.add(log)


def _mark_schedule_triggered(db: Session, schedule: Schedule, now: datetime.datetime) -> None:
    schedule.last_triggered_at = now
    db.commit()


async def _process_period_schedule_push(
    db: Session,
    schedule: Schedule,
    dispenser: Dispenser,
    period: str,
    now: datetime.datetime,
) -> bool:
    """Legacy LAN push mode — POST /dispense directly to ESP IP. Returns True if dispensed."""
    if not dispenser.ip_address:
        logger.warning(
            "[Scheduler] Dispenser %s has no IP yet (no heartbeat) — skipped",
            dispenser.hardware_id,
        )
        _record_log(db, schedule, False, "no ip_address — heartbeat not received")
        db.commit()
        return False

    status = await _get_status(dispenser.ip_address)
    if status is None:
        _record_log(db, schedule, False, "could not read ESP /status")
        db.commit()
        return False

    if status.get("awaiting_confirm") in (True, "true"):
        if SCHEDULER_IGNORE_AWAITING_CONFIRM:
            logger.warning(
                "[Scheduler] Ignorando awaiting_confirm (lab) — %s period=%s",
                dispenser.hardware_id,
                period,
            )
        else:
            logger.warning(
                "[Scheduler] Dispenser %s awaiting confirmation — skipped %s",
                dispenser.hardware_id,
                period,
            )
            _record_log(db, schedule, False, "awaiting_confirm on dispenser")
            db.commit()
            return False

    current_slot = int(status.get("current_slot", -1))
    expected_after = carousel_slot_after_sequential(current_slot, TOTAL_CAROUSEL_SLOTS)

    logger.info(
        "[Scheduler] push → %s @ %s  period=%s  current_slot=%s  expected_after=%s",
        dispenser.hardware_id,
        dispenser.ip_address,
        period,
        current_slot,
        expected_after,
    )

    success, err_detail = await _call_dispense(
        dispenser.ip_address, period, expected_after
    )
    error = None if success else (err_detail or "ESP /dispense failed")
    _record_log(db, schedule, success, error)
    db.commit()

    if success:
        logger.info(
            "[Scheduler] Dispensed — dispenser %s period %s",
            dispenser.hardware_id,
            period,
        )
    else:
        logger.error("[Scheduler] Dispense failed — dispenser %s", dispenser.hardware_id)
    return success


async def _process_period_schedule_queue(
    db: Session,
    schedule: Schedule,
    dispenser: Dispenser,
    period: str,
) -> bool:
    """Queue mode — enqueue command for delivery via heartbeat response."""
    if crud_command_queue.has_active_dispense(db, dispenser.hardware_id):
        logger.warning(
            "[Scheduler] Dispenser %s has active dispense in queue — skipped %s",
            dispenser.hardware_id,
            period,
        )
        return False

    if dispenser.awaiting_confirm:
        if SCHEDULER_IGNORE_AWAITING_CONFIRM:
            logger.warning(
                "[Scheduler] Ignorando awaiting_confirm (lab) — %s period=%s",
                dispenser.hardware_id,
                period,
            )
        else:
            logger.warning(
                "[Scheduler] Dispenser %s awaiting confirmation — skipped %s",
                dispenser.hardware_id,
                period,
            )
            return False

    if dispenser.current_slot is None:
        logger.warning(
            "[Scheduler] Dispenser %s has no current_slot from heartbeat — skipped %s",
            dispenser.hardware_id,
            period,
        )
        return False

    expected_after = carousel_slot_after_sequential(
        dispenser.current_slot, TOTAL_CAROUSEL_SLOTS
    )

    command = crud_command_queue.enqueue_dispense(
        db,
        dispenser.hardware_id,
        period,
        expected_after,
        schedule.id,
        silent_mode=bool(schedule.silent_mode),
    )

    logger.info(
        "[Scheduler] enqueued %s for %s period=%s expected_slot=%s command_id=%s",
        command.command_type,
        dispenser.hardware_id,
        period,
        expected_after,
        command.id,
    )
    return True


async def _process_period_schedule(
    db: Session, schedule: Schedule, now: datetime.datetime
) -> None:
    period = schedule.period
    if period not in _PERIOD_ORDER:
        return

    dispenser: Dispenser | None = None
    if schedule.dispenser_id:
        dispenser = (
            db.query(Dispenser)
            .filter(Dispenser.hardware_id == schedule.dispenser_id)
            .first()
        )

    if not dispenser:
        logger.warning(
            "[Scheduler] Schedule %s: dispenser '%s' not in DB — skipped",
            schedule.id,
            schedule.dispenser_id,
        )
        if SCHEDULER_MODE == "push":
            _record_log(db, schedule, False, "dispenser not found in DB")
            db.commit()
        return

    triggered = False
    if SCHEDULER_MODE == "push":
        triggered = await _process_period_schedule_push(db, schedule, dispenser, period, now)
    else:
        triggered = await _process_period_schedule_queue(db, schedule, dispenser, period)

    if triggered:
        _mark_schedule_triggered(db, schedule, now)


async def run_dispense_scheduler() -> None:
    """Async background task: poll DB and fire due period schedules."""
    logger.info(
        "[Scheduler] Started — mode=%s tz=%s polling every %d s (period-based)",
        SCHEDULER_MODE,
        SCHEDULER_TIMEZONE,
        SCHEDULER_POLL_SECONDS,
    )

    while True:
        try:
            now = scheduler_now()
            dedup_cutoff = now - datetime.timedelta(seconds=SCHEDULER_DEDUP_SECONDS)

            db: Session = SessionLocal()
            try:
                crud_command_queue.expire_stale_delivered(
                    db, COMMAND_ACK_TIMEOUT_SECONDS
                )

                candidates = (
                    db.query(Schedule)
                    .filter(Schedule.is_active == True)  # noqa: E712
                    .filter(Schedule.period.isnot(None))
                    .all()
                )
                dispenser_ids = {
                    s.dispenser_id for s in candidates if s.dispenser_id
                }
                dispensers_by_id: dict[str, Dispenser] = {}
                if dispenser_ids:
                    rows = (
                        db.query(Dispenser)
                        .filter(Dispenser.hardware_id.in_(dispenser_ids))
                        .all()
                    )
                    dispensers_by_id = {d.hardware_id: d for d in rows}

                due = [
                    s
                    for s in candidates
                    if _is_due(
                        s,
                        now,
                        dedup_cutoff,
                        dispensers_by_id.get(s.dispenser_id or ""),
                    )
                ]
                due.sort(key=lambda s: (_PERIOD_ORDER.get(s.period or "", 99), s.dispenser_id or ""))

                if due:
                    logger.info("[Scheduler] %d period schedule(s) due at %s", len(due), now.isoformat())

                dispensers_enqueued_this_poll: set[str] = set()
                for schedule in due:
                    hw_id = schedule.dispenser_id or ""
                    if hw_id in dispensers_enqueued_this_poll:
                        continue
                    await _process_period_schedule(db, schedule, now)
                    if schedule.last_triggered_at and schedule.last_triggered_at >= dedup_cutoff:
                        dispensers_enqueued_this_poll.add(hw_id)
            finally:
                db.close()

        except Exception:
            logger.exception("[Scheduler] Unexpected error — loop continues")

        await asyncio.sleep(SCHEDULER_POLL_SECONDS)
