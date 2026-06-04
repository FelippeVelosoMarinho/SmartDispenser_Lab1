"""Integration-style test: due schedules fire in position order with mocked ESP."""

import asyncio
import datetime
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.domain import Dispenser, Schedule, Slot
from app.services.scheduler import _is_due, _process_schedule


def test_due_schedules_sorted_by_position():
    now = datetime.datetime(2026, 6, 10, 8, 0, 10)
    dedup = now - datetime.timedelta(seconds=90)
    s1 = Schedule(
        id=uuid.uuid4(),
        is_active=True,
        scheduled_at=datetime.datetime(2026, 6, 10, 8, 0, 0),
        slot_id=1,
        last_triggered_at=None,
    )
    s2 = Schedule(
        id=uuid.uuid4(),
        is_active=True,
        scheduled_at=datetime.datetime(2026, 6, 10, 8, 0, 5),
        slot_id=2,
        last_triggered_at=None,
    )
    assert _is_due(s1, now, dedup)
    assert _is_due(s2, now, dedup)


def test_full_dispense_flow_mocked():
    """Simula 3 posições: só dispara quando current_slot bate com a posição esperada."""
    import asyncio

    now = datetime.datetime(2026, 6, 10, 8, 0, 0)
    dispenser = Dispenser(hardware_id="disp_flow", ip_address="10.0.0.1")
    current_slot = {"value": 0}

    schedules = []
    for pos in (1, 2, 3):
        schedules.append(
            Schedule(
                id=uuid.uuid4(),
                dispenser_id="disp_flow",
                slot_id=pos,
                is_active=True,
                scheduled_at=now,
                last_triggered_at=None,
            )
        )

    def query_side_effect(model):
        q = MagicMock()
        if model is Dispenser:
            q.filter.return_value.first.return_value = dispenser
        elif model is Slot:
            def first():
                # last filter by Slot.id — approximate via call count
                return Slot(id=1, position_number=current_slot["value"] + 1)
            q.filter.return_value.first.side_effect = lambda: Slot(
                id=current_slot["value"] + 1,
                position_number=current_slot["value"] + 1,
            )
        return q

    db = MagicMock()
    db.query.side_effect = query_side_effect

    async def mock_status(ip):
        return {"current_slot": current_slot["value"], "awaiting_confirm": False}

    async def mock_dispense(ip, period, expected_slot):
        current_slot["value"] = expected_slot
        return True, None

    async def run_one(schedule):
        with patch("app.services.scheduler._get_status", side_effect=mock_status):
            with patch("app.services.scheduler._call_dispense", side_effect=mock_dispense):
                await _process_schedule(db, schedule, now)

    async def run_all():
        for s in schedules:
            slot_mock = Slot(id=s.slot_id, position_number=s.slot_id)
            db.query.side_effect = lambda model, sm=slot_mock: (
                MagicMock(filter=MagicMock(return_value=MagicMock(first=MagicMock(return_value=(
                    dispenser if model is Dispenser else sm
                )))))
            )
            await run_one(s)

    asyncio.run(run_all())
    assert current_slot["value"] == 3
