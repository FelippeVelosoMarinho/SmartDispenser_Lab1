"""Tests for pending command queue (heartbeat delivery)."""

import datetime
import uuid

import pytest

from app.core.database import SessionLocal
from app.crud import command_queue as crud_command_queue
from app.models.domain import Dispenser, PendingCommand, Schedule


@pytest.fixture(autouse=True)
def clear_db():
    db = SessionLocal()
    db.query(PendingCommand).delete()
    db.query(Schedule).delete()
    db.query(Dispenser).delete()
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(PendingCommand).delete()
    db.query(Schedule).delete()
    db.query(Dispenser).delete()
    db.commit()
    db.close()


def _seed_dispenser_and_schedule(db):
    dispenser = Dispenser(hardware_id="AA:BB:CC:DD:EE:FF", current_slot=0)
    db.add(dispenser)
    schedule = Schedule(
        dispenser_id="AA:BB:CC:DD:EE:FF",
        period="morning",
        is_active=True,
        time_legacy="08:00",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def test_enqueue_dispense_creates_pending():
    db = SessionLocal()
    schedule = _seed_dispenser_and_schedule(db)
    cmd = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 1, schedule.id
    )
    assert cmd.status == "pending"
    assert cmd.command_type == "dispense"
    assert cmd.expected_slot == 1
    db.close()


def test_enqueue_dedup_by_schedule_id():
    db = SessionLocal()
    schedule = _seed_dispenser_and_schedule(db)
    first = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 1, schedule.id
    )
    second = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 2, schedule.id
    )
    assert first.id == second.id
    db.close()


def test_delivery_fifo_and_mark_delivered():
    db = SessionLocal()
    schedule = _seed_dispenser_and_schedule(db)
    cmd = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 1, schedule.id
    )
    fetched = crud_command_queue.get_command_for_delivery(db, "AA:BB:CC:DD:EE:FF")
    assert fetched is not None
    assert fetched.id == cmd.id
    crud_command_queue.mark_delivered(db, fetched)
    db.refresh(fetched)
    assert fetched.status == "delivered"
    assert fetched.delivered_at is not None
    redelivered = crud_command_queue.get_command_for_delivery(db, "AA:BB:CC:DD:EE:FF")
    assert redelivered.id == cmd.id
    db.close()


def test_process_command_ack_success():
    db = SessionLocal()
    schedule = _seed_dispenser_and_schedule(db)
    cmd = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 1, schedule.id
    )
    crud_command_queue.mark_delivered(db, cmd)
    result = crud_command_queue.process_command_ack(db, cmd.id, True, None)
    assert result.status == "completed"
    db.close()


def test_process_command_ack_failure():
    db = SessionLocal()
    schedule = _seed_dispenser_and_schedule(db)
    cmd = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 1, schedule.id
    )
    crud_command_queue.mark_delivered(db, cmd)
    result = crud_command_queue.process_command_ack(db, cmd.id, False, "slot_mismatch")
    assert result.status == "failed"
    assert result.error_message == "slot_mismatch"
    db.close()


def test_expire_stale_delivered():
    db = SessionLocal()
    schedule = _seed_dispenser_and_schedule(db)
    cmd = crud_command_queue.enqueue_dispense(
        db, "AA:BB:CC:DD:EE:FF", "morning", 1, schedule.id
    )
    crud_command_queue.mark_delivered(db, cmd)
    cmd.delivered_at = datetime.datetime.utcnow() - datetime.timedelta(seconds=1200)
    db.commit()
    expired = crud_command_queue.expire_stale_delivered(db, 900)
    assert expired == 1
    db.refresh(cmd)
    assert cmd.status == "failed"
    db.close()
