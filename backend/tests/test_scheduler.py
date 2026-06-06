"""Unit tests for period-based dispense scheduler."""

import asyncio
import datetime
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.domain import Dispenser, Schedule
from app.services.scheduler import (
    _effective_scheduled_at,
    _is_due,
    _process_period_schedule,
)


def test_effective_scheduled_at_from_hhmm_legacy():
    s = Schedule(time_legacy="21:00")
    result = _effective_scheduled_at(s)
    assert result is not None
    assert result.hour == 21
    assert result.minute == 0


def test_is_due_requires_period():
    now = datetime.datetime.now().replace(second=5, microsecond=0)
    dedup = now - datetime.timedelta(seconds=90)
    legacy = Schedule(
        is_active=True,
        time_legacy="21:00",
        last_triggered_at=None,
    )
    assert _is_due(legacy, now, dedup) is False

    hhmm = now.strftime("%H:%M")
    period = Schedule(
        is_active=True,
        period="morning",
        time_legacy=hhmm,
        last_triggered_at=None,
    )
    assert _is_due(period, now, dedup) is True


def test_is_due_outside_window():
    now = datetime.datetime(2026, 6, 10, 21, 5, 0)
    dedup = now - datetime.timedelta(seconds=90)
    s = Schedule(
        is_active=True,
        period="morning",
        time_legacy="21:00",
        last_triggered_at=None,
    )
    assert _is_due(s, now, dedup) is False


def test_is_due_respects_dedup():
    now = datetime.datetime(2026, 6, 10, 21, 0, 5)
    dedup = now - datetime.timedelta(seconds=90)
    s = Schedule(
        is_active=True,
        period="morning",
        time_legacy="21:00",
        last_triggered_at=now - datetime.timedelta(seconds=10),
    )
    assert _is_due(s, now, dedup) is False


def test_process_period_schedule_enqueues_in_queue_mode():
    db = MagicMock()
    schedule = Schedule(
        id=uuid.uuid4(),
        dispenser_id="disp_test",
        period="morning",
        patient_id=None,
        is_active=True,
    )
    dispenser = Dispenser(
        hardware_id="disp_test",
        ip_address="192.168.1.50",
        current_slot=0,
        awaiting_confirm=False,
    )

    def query_side_effect(model):
        q = MagicMock()
        if model is Dispenser:
            q.filter.return_value.first.return_value = dispenser
        return q

    db.query.side_effect = query_side_effect

    async def run():
        with patch("app.services.scheduler.SCHEDULER_MODE", "queue"):
            with patch(
                "app.services.scheduler.crud_command_queue.enqueue_dispense"
            ) as mock_enqueue:
                mock_enqueue.return_value = MagicMock(
                    id=uuid.uuid4(),
                    command_type="dispense",
                )
                await _process_period_schedule(db, schedule, datetime.datetime.now())
                mock_enqueue.assert_called_once_with(
                    db,
                    "disp_test",
                    "morning",
                    1,
                    schedule.id,
                )

    asyncio.run(run())
    assert db.commit.called


def test_process_period_schedule_skips_awaiting_confirm_queue_mode():
    db = MagicMock()
    schedule = Schedule(
        id=uuid.uuid4(),
        dispenser_id="disp_test",
        period="afternoon",
        patient_id=None,
        is_active=True,
    )
    dispenser = Dispenser(
        hardware_id="disp_test",
        ip_address="192.168.1.50",
        current_slot=1,
        awaiting_confirm=True,
    )

    def query_side_effect(model):
        q = MagicMock()
        if model is Dispenser:
            q.filter.return_value.first.return_value = dispenser
        return q

    db.query.side_effect = query_side_effect

    async def run():
        with patch("app.services.scheduler.SCHEDULER_MODE", "queue"):
            with patch(
                "app.services.scheduler.crud_command_queue.enqueue_dispense"
            ) as mock_enqueue:
                await _process_period_schedule(db, schedule, datetime.datetime.now())
                mock_enqueue.assert_not_called()

    asyncio.run(run())


def test_process_period_schedule_push_mode_dispenses():
    db = MagicMock()
    schedule = Schedule(
        id=uuid.uuid4(),
        dispenser_id="disp_test",
        period="morning",
        patient_id=None,
        is_active=True,
    )
    dispenser = Dispenser(hardware_id="disp_test", ip_address="192.168.1.50")

    def query_side_effect(model):
        q = MagicMock()
        if model is Dispenser:
            q.filter.return_value.first.return_value = dispenser
        return q

    db.query.side_effect = query_side_effect

    async def run():
        with patch("app.services.scheduler.SCHEDULER_MODE", "push"):
            with patch("app.services.scheduler._get_status", new_callable=AsyncMock) as mock_status:
                with patch("app.services.scheduler._call_dispense", new_callable=AsyncMock) as mock_dispense:
                    mock_status.return_value = {"current_slot": 0, "awaiting_confirm": False}
                    mock_dispense.return_value = (True, None)
                    await _process_period_schedule(db, schedule, datetime.datetime.now())
                    mock_dispense.assert_called_once_with(
                        "192.168.1.50", "morning", 1
                    )

    asyncio.run(run())
    assert db.commit.called
