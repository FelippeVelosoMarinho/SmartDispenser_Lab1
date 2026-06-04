"""Unit tests for dispense scheduler helpers."""

import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.domain import Dispenser, Schedule, Slot
from app.services.scheduler import _effective_scheduled_at, _is_due, _process_schedule


def test_effective_scheduled_at_from_scheduled_at():
    s = Schedule(
        scheduled_at=datetime.datetime(2026, 6, 10, 8, 0),
        time_legacy="2026-06-10T08:00",
    )
    assert _effective_scheduled_at(s) == datetime.datetime(2026, 6, 10, 8, 0)


def test_is_due_within_window():
    now = datetime.datetime(2026, 6, 10, 8, 0, 15)
    s = Schedule(
        is_active=True,
        scheduled_at=datetime.datetime(2026, 6, 10, 8, 0, 0),
        last_triggered_at=None,
    )
    dedup = now - datetime.timedelta(seconds=90)
    assert _is_due(s, now, dedup) is True


def test_is_due_outside_window():
    now = datetime.datetime(2026, 6, 10, 8, 5, 0)
    s = Schedule(
        is_active=True,
        scheduled_at=datetime.datetime(2026, 6, 10, 8, 0, 0),
        last_triggered_at=None,
    )
    dedup = now - datetime.timedelta(seconds=90)
    assert _is_due(s, now, dedup) is False


def test_is_due_respects_dedup():
    now = datetime.datetime(2026, 6, 10, 8, 0, 5)
    s = Schedule(
        is_active=True,
        scheduled_at=datetime.datetime(2026, 6, 10, 8, 0, 0),
        last_triggered_at=now - datetime.timedelta(seconds=10),
    )
    dedup = now - datetime.timedelta(seconds=90)
    assert _is_due(s, now, dedup) is False


def test_process_schedule_skips_carousel_mismatch():
    import asyncio
    import uuid

    db = MagicMock()
    schedule = Schedule(
        id=uuid.uuid4(),
        dispenser_id="disp_test",
        slot_id=1,
        patient_id=None,
        is_active=True,
    )
    dispenser = Dispenser(hardware_id="disp_test", ip_address="192.168.1.50")
    slot = Slot(id=1, position_number=2)

    def query_side_effect(model):
        q = MagicMock()
        if model is Dispenser:
            q.filter.return_value.first.return_value = dispenser
        elif model is Slot:
            q.filter.return_value.first.return_value = slot
        return q

    db.query.side_effect = query_side_effect

    async def run():
        with patch("app.services.scheduler._get_status", new_callable=AsyncMock) as mock_status:
            with patch("app.services.scheduler._call_dispense", new_callable=AsyncMock) as mock_dispense:
                mock_status.return_value = {"current_slot": 0, "awaiting_confirm": False}
                await _process_schedule(db, schedule, datetime.datetime.now())
                mock_status.assert_called_once()
                mock_dispense.assert_not_called()

    asyncio.run(run())
    assert db.add.called
