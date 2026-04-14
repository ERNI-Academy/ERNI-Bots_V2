"""
Migration: add player profile fields (first_name, last_name, job_title).

Safe to run multiple times (idempotent). Supports SQLite and PostgreSQL.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.DATABASE_URL)

NEW_COLUMNS = [
    ("first_name", "VARCHAR(100)"),
    ("last_name",  "VARCHAR(100)"),
    ("job_title",  "VARCHAR(100)"),
]


def column_exists(conn, table: str, column: str) -> bool:
    dialect = engine.dialect.name
    if dialect == "sqlite":
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return any(row[1] == column for row in rows)
    else:
        row = conn.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ), {"t": table, "c": column}).fetchone()
        return row is not None


with engine.begin() as conn:
    for col, definition in NEW_COLUMNS:
        if column_exists(conn, "players", col):
            print(f"[migrate] players.{col} already exists, skipping.")
        else:
            conn.execute(text(f"ALTER TABLE players ADD COLUMN {col} {definition}"))
            print(f"[migrate] players.{col} added ✓")
