"""
Test setup: an isolated SQLite database per test session.

The environment is set before any GameBackEnd module is imported, because
db/__init__.py builds the engine from Config.DATABASE_URL at import time.
load_dotenv() never overrides variables that are already set.
"""

import os
import sys
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(prefix="ernibots-tests-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_FILE}"
os.environ["AGENT_MODE"] = "mock"
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-enough-length-1234")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402

from db import SessionLocal, engine  # noqa: E402
from db.base import Base  # noqa: E402
from db import models as _models  # noqa: E402,F401  (register every model)

Base.metadata.create_all(bind=engine)


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
def app(db):
    from app import create_app

    return create_app()


@pytest.fixture
def client(app):
    test_client = app.test_client()
    # The rate limiter keys on X-Forwarded-For (set by the Azure proxy) and rejects requests without it.
    test_client.environ_base["HTTP_X_FORWARDED_FOR"] = "203.0.113.10"
    return test_client
