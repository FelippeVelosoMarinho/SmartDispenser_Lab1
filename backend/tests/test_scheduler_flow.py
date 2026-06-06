"""Integration-style test: period schedules fire sequentially with mocked ESP."""

import asyncio
import datetime
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.domain import Dispenser, Schedule
from app.services.scheduler import _process_period_schedule


def test_period_sequence_morning_afternoon_night():
    """Simula manhã→tarde→noite: cada dispense avança current_slot +1."""
    now = datetime.datetime(2026, 6, 10, 21, 0, 0)
    dispenser = Dispenser(hardware_id="disp_flow", ip_address="10.0.0.1")
    current_slot = {"value": 0}
    dispense_calls: list[tuple[str, int]] = []

    schedules = [
        Schedule(
            id=uuid.uuid4(),
            dispenser_id="disp_flow",
            period="morning",
            is_active=True,
            time_legacy="21:00",
            last_triggered_at=None,
        ),
        Schedule(
            id=uuid.uuid4(),
            dispenser_id="disp_flow",
            period="afternoon",
            is_active=True,
            time_legacy="21:01",
            last_triggered_at=None,
        ),
        Schedule(
            id=uuid.uuid4(),
            dispenser_id="disp_flow",
            period="night",
            is_active=True,
            time_legacy="21:02",
            last_triggered_at=None,
        ),
    ]

    def query_side_effect(model):
        q = MagicMock()
        if model is Dispenser:
            q.filter.return_value.first.return_value = dispenser
        return q

    db = MagicMock()
    db.query.side_effect = query_side_effect

    async def mock_status(ip):
        return {"current_slot": current_slot["value"], "awaiting_confirm": False}

    async def mock_dispense(ip, period, expected_slot):
        dispense_calls.append((period, expected_slot))
        current_slot["value"] = expected_slot
        return True, None

    async def run_all():
        for s in schedules:
            with patch("app.services.scheduler._get_status", side_effect=mock_status):
                with patch("app.services.scheduler._call_dispense", side_effect=mock_dispense):
                    await _process_period_schedule(db, s, now)

    asyncio.run(run_all())

    assert dispense_calls == [
        ("morning", 1),
        ("afternoon", 2),
        ("night", 3),
    ]
    assert current_slot["value"] == 3
