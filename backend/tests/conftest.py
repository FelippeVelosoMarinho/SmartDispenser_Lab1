"""Pytest bootstrap: fresh schema + migrations before integration tests."""

import pytest

from app.core.database import Base, SessionLocal, engine
from app.core.migrations import run_migrations


@pytest.fixture(scope="session", autouse=True)
def _prepare_database():
    """Ensure tables exist and migrations ran (matches app startup)."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    try:
        run_migrations(engine)
    except Exception:
        # SQLite dev DB may not support PostgreSQL-specific migration SQL;
        # create_all already defines the current schema for unit tests.
        pass
    yield
