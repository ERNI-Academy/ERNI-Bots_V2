"""
Migration: add player_guess column to battles table.

Records the word the player submitted when making their single guess attempt.
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
    if column_exists(conn, "battles", "player_guess"):
        print("[migrate_battle_player_guess] player_guess already exists, skipping.")
    else:
        conn.execute(text("ALTER TABLE battles ADD COLUMN player_guess VARCHAR(200)"))
        print("[migrate_battle_player_guess] player_guess column added ✓")
