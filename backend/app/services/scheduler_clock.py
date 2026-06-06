"""Wall-clock helpers for the dispense scheduler (timezone-aware)."""

from __future__ import annotations

import datetime
from zoneinfo import ZoneInfo

from app.core.config import SCHEDULER_TIMEZONE

_TZ = ZoneInfo(SCHEDULER_TIMEZONE)


def scheduler_now() -> datetime.datetime:
    """Current local wall time in SCHEDULER_TIMEZONE (naive, for HH:MM schedules)."""
    return datetime.datetime.now(_TZ).replace(tzinfo=None)
