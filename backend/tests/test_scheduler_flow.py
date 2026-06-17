"""Integration-style test: period schedules enqueue commands in queue mode."""

import asyncio
import datetime
import uuid
from unittest.mock import MagicMock, patch

from app.models.domain import Dispenser, Schedule
from app.services.scheduler import _process_period_schedule


def test_period_sequence_enqueues_morning_afternoon_night():
    """Simula manhã→tarde→noite: cada schedule enfileira expected_slot +1."""
    now = datetime.datetime(2026, 6, 10, 21, 0, 0)
    dispenser = Dispenser(
        hardware_id="disp_flow",
        ip_address="10.0.0.1",
        current_slot=0,
        awaiting_confirm=False,
    )
    enqueue_calls: list[tuple[str, int]] = []

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

    def fake_enqueue(db_sess, hardware_id, period, expected_slot, schedule_id, *, silent_mode=False):
        enqueue_calls.append((period, expected_slot))
        dispenser.current_slot = expected_slot
        cmd = MagicMock()
        cmd.id = uuid.uuid4()
        cmd.command_type = "dispense"
        return cmd

    async def run_all():
        with patch("app.services.scheduler.SCHEDULER_MODE", "queue"):
            with patch(
                "app.services.scheduler.crud_command_queue.has_active_dispense",
                return_value=False,
            ):
                with patch(
                    "app.services.scheduler.crud_command_queue.enqueue_dispense",
                    side_effect=fake_enqueue,
                ):
                    for s in schedules:
                        await _process_period_schedule(db, s, now)

    asyncio.run(run_all())

    assert enqueue_calls == [
        ("morning", 1),
        ("afternoon", 2),
        ("night", 3),
    ]
    assert dispenser.current_slot == 3
