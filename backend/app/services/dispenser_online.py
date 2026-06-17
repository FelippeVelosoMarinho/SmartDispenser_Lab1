"""Resolve whether a dispenser should be considered online (heartbeat-based)."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models.domain import Dispenser

# Firmware sends heartbeat every 30 s; mark offline after ~3 missed beats.
OFFLINE_AFTER_SECONDS = 90


def is_dispenser_online(dispenser: "Dispenser", now: datetime.datetime | None = None) -> bool:
    """True only if flagged online and last_sync is within the offline window."""
    now = now or datetime.datetime.utcnow()
    if not dispenser.is_online:
        return False
    if not dispenser.last_sync:
        return False
    elapsed = now - dispenser.last_sync
    if elapsed.total_seconds() > OFFLINE_AFTER_SECONDS:
        return False
    return True


def refresh_dispenser_online_state(
    db: "Session",
    dispenser: "Dispenser",
    *,
    persist: bool = True,
) -> bool:
    """Recompute online flag; optionally persist when stale."""
    online = is_dispenser_online(dispenser)
    should_clear_ip = not online and dispenser.ip_address is not None
    if persist and (dispenser.is_online != online or should_clear_ip):
        dispenser.is_online = online
        if should_clear_ip:
            dispenser.ip_address = None
        db.commit()
        db.refresh(dispenser)
    return online
