"""
Migration: add is_banned, banned_at and is_admin columns to the players table.

Compatible with SQLite (dev) and PostgreSQL (Azure production).
Safe to run multiple times — skips columns that already exist.

Usage (from GameBackEnd/):
    python scripts/migrate_player_ban.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from db import engine


def column_exists(conn, table: str, column: str) -> bool:
    dialect = conn.engine.dialect.name  # "sqlite" | "postgresql"

    if dialect == "sqlite":
        result = conn.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in result)

    # PostgreSQL — use information_schema
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """), {"table": table, "column": column})
    return result.fetchone() is not None


def add_column_if_missing(conn, table: str, column: str, definition: str):
    if not column_exists(conn, table, column):
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        print(f"✓ Added column: {table}.{column}")
    else:
        print(f"– Already exists: {table}.{column}")


def run():
    with engine.connect() as conn:
        add_column_if_missing(conn, "players", "is_banned", "BOOLEAN NOT NULL DEFAULT 0")
        add_column_if_missing(conn, "players", "banned_at", "TIMESTAMP")
        add_column_if_missing(conn, "players", "is_admin",  "BOOLEAN NOT NULL DEFAULT 0")
        conn.commit()

    print("Migration complete.")


if __name__ == "__main__":
    run()
