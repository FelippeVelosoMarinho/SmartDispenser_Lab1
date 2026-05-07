"""Dispenser CRUD operations (in-memory store)."""

from typing import Dict

# Mock in-memory status for dispensers
DISPENSER_STATUS: Dict[str, dict] = {}


def get_dispenser_status(dispenser_id: str) -> dict:
    """Get the telemetry status for a dispenser. Returns mock data if not set."""
    if dispenser_id not in DISPENSER_STATUS:
        return {
            "dispenser_id": dispenser_id,
            "battery_level": 85.5,
            "online": True,
            "critical_stock": False
        }
    return DISPENSER_STATUS[dispenser_id]


def update_dispenser_status(dispenser_id: str, status: dict) -> dict:
    """Update dispenser telemetry status."""
    DISPENSER_STATUS[dispenser_id] = status
    return status


def clear_dispenser_status() -> None:
    """Clear all dispenser statuses (useful for tests)."""
    DISPENSER_STATUS.clear()
