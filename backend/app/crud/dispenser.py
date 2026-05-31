"""Dispenser CRUD operations (database store)."""

from typing import Optional
from sqlalchemy.orm import Session
from app.models.domain import Dispenser


def get_dispenser_status(db: Session, hardware_id: str) -> dict:
    """Get the telemetry status for a dispenser."""
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    if not dispenser:
        return {
            "dispenser_id": hardware_id,
            "battery_level": 0.0,
            "online": False,
            "critical_stock": False
        }
        
    return {
        "dispenser_id": dispenser.hardware_id,
        "battery_level": float(dispenser.battery_level) if dispenser.battery_level is not None else 100.0,
        "online": dispenser.is_online,
        "critical_stock": dispenser.critical_stock
    }


def update_dispenser_status(db: Session, hardware_id: str, status: dict) -> dict:
    """Update dispenser telemetry status."""
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    
    if not dispenser:
        # Create it if it doesn't exist
        dispenser = Dispenser(
            hardware_id=hardware_id,
            battery_level=status.get("battery_level", 100.0),
            is_online=status.get("online", True),
            critical_stock=status.get("critical_stock", False)
        )
        db.add(dispenser)
    else:
        dispenser.battery_level = status.get("battery_level", dispenser.battery_level)
        dispenser.is_online = status.get("online", dispenser.is_online)
        dispenser.critical_stock = status.get("critical_stock", dispenser.critical_stock)
        
    db.commit()
    db.refresh(dispenser)
    return status
