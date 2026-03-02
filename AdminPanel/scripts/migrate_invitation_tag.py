"""
Migration: add tag column to invitation_codes table.

Safe to run multiple times (idempotent). Supports SQLite and PostgreSQL.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.DATABASE_URL)


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
    if column_exists(conn, "invitation_codes", "tag"):
        print("[migrate] invitation_codes.tag already exists, skipping.")
    else:
        conn.execute(text("ALTER TABLE invitation_codes ADD COLUMN tag VARCHAR(100)"))
        print("[migrate] invitation_codes.tag added ✓")
