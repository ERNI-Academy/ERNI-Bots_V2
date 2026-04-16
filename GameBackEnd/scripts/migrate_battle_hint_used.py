"""
Migration: add hint_used column to battles table.

Tracks whether the attacker requested a hint during a PvP battle.
When True, victory rewards are halved.
Safe to run multiple times (idempotent). Supports SQLite and PostgreSQL.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.DATABASE_URL)
dialect = engine.dialect.name


def column_exists(conn, table: str, column: str) -> bool:
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
    if column_exists(conn, "battles", "hint_used"):
        print("[migrate_battle_hint_used] hint_used already exists, skipping.")
    else:
        conn.execute(text("ALTER TABLE battles ADD COLUMN hint_used BOOLEAN NOT NULL DEFAULT FALSE"))
        print("[migrate_battle_hint_used] hint_used column added ✓")
