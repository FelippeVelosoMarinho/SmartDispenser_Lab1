import datetime

from app.models.domain import Dispenser
from app.services.dispenser_online import OFFLINE_AFTER_SECONDS, is_dispenser_online


def test_online_with_recent_sync():
    now = datetime.datetime.utcnow()
    d = Dispenser(hardware_id="x", is_online=True, last_sync=now - datetime.timedelta(seconds=10))
    assert is_dispenser_online(d, now=now) is True


def test_offline_when_sync_stale():
    now = datetime.datetime.utcnow()
    d = Dispenser(
        hardware_id="x",
        is_online=True,
        last_sync=now - datetime.timedelta(seconds=OFFLINE_AFTER_SECONDS + 1),
    )
    assert is_dispenser_online(d, now=now) is False


def test_offline_without_last_sync():
    d = Dispenser(hardware_id="x", is_online=True, last_sync=None)
    assert is_dispenser_online(d) is False


def test_offline_when_flag_false():
    now = datetime.datetime.utcnow()
    d = Dispenser(hardware_id="x", is_online=False, last_sync=now)
    assert is_dispenser_online(d, now=now) is False
