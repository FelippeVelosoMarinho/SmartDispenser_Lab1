import datetime

import pytest

from app.services.schedule_utils import (
    carousel_slot_after_dispense,
    carousel_slot_before_dispense,
    parse_schedule_time,
)


def test_parse_iso_datetime():
    scheduled_at, legacy, st = parse_schedule_time("2026-06-10T14:30")
    assert scheduled_at == datetime.datetime(2026, 6, 10, 14, 30)
    assert legacy == "2026-06-10T14:30"
    assert st == datetime.time(14, 30)


def test_parse_hhmm_uses_today():
    scheduled_at, legacy, _ = parse_schedule_time("09:15")
    assert legacy == "09:15"
    assert scheduled_at.hour == 9
    assert scheduled_at.minute == 15


def test_carousel_slot_mapping():
    assert carousel_slot_before_dispense(1) == 0
    assert carousel_slot_after_dispense(1) == 1
    assert carousel_slot_before_dispense(21) == 20
    assert carousel_slot_after_dispense(21) == 0
