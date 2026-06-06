"""Tests for scheduler wall-clock timezone."""

from zoneinfo import ZoneInfo

from app.services.scheduler_clock import scheduler_now


def test_scheduler_now_uses_configured_timezone():
    now = scheduler_now()
    assert now.tzinfo is None
    aware = now.replace(tzinfo=ZoneInfo("America/Sao_Paulo"))
    assert aware.hour == now.hour
    assert aware.minute == now.minute
