"""
Migration: add is_bot column to the players table.

Also bulk-sets is_bot = TRUE for all players whose email ends with
@protocolo.gg (the NPC / seed player domain).

Compatible with SQLite (dev) and PostgreSQL (Azure production).
Safe to run multiple times — skips the ALTER if the column already exists.

Usage (from GameBackEnd/):
    python scripts/migrate_is_bot.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from db import engine


def column_exists(conn, table: str, column: str) -> bool:
    dialect = conn.engine.dialect.name  # "sqlite" | "postgresql"

    if dialect == "sqlite":
        result = conn.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in result)

    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """), {"table": table, "column": column})
    return result.fetchone() is not None


def run():
    with engine.connect() as conn:
        # 1. Add column if missing
        if not column_exists(conn, "players", "is_bot"):
            conn.execute(text(
                "ALTER TABLE players ADD COLUMN is_bot BOOLEAN NOT NULL DEFAULT 0"
            ))
            print("✓ Added column: players.is_bot")
        else:
            print("– Already exists: players.is_bot")

        # 2. Backfill: mark all @protocolo.gg accounts as bots
        result = conn.execute(text(
            "UPDATE players SET is_bot = TRUE WHERE email LIKE '%@protocolo.gg'"
        ))
        print(f"✓ Marked {result.rowcount} @protocolo.gg player(s) as is_bot = TRUE")

        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    run()
