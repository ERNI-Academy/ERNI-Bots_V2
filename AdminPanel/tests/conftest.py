"""
Test setup: an isolated SQLite database per test session.

The environment is set before any AdminPanel module is imported, because
db/__init__.py builds the engine from Config.DATABASE_URL at import time.
"""

import os
import sys
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(prefix="ernibots-admin-tests-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_FILE}"
os.environ["ADMIN_SECRET"] = "test-admin-secret"
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-enough-length-1234")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402

from db import SessionLocal, engine  # noqa: E402
from db.base import Base  # noqa: E402
from db import models as _models  # noqa: E402,F401  (register every model)

Base.metadata.create_all(bind=engine)

ADMIN_HEADERS = {"X-Admin-Secret": os.environ["ADMIN_SECRET"]}


@pytest.fixture
def db():
    """A session on a clean database: every table is emptied after the test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        with engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture
def client(db):
    from app import create_app

    app = create_app()
    test_client = app.test_client()
    # The rate limiter keys on X-Forwarded-For (set by the Azure proxy).
    test_client.environ_base["HTTP_X_FORWARDED_FOR"] = "203.0.113.10"
    return test_client
