"""
Migration: rename bosses.reward_count  →  bosses.reward_score

Safe to run multiple times (idempotent).
Supports SQLite and PostgreSQL.
"""
import os
import sys

# Add the GameBackEnd root to sys.path so config/db are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)

def column_exists(conn, table: str, column: str) -> bool:
    dialect = engine.dialect.name
    if dialect == "sqlite":
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return any(row[1] == column for row in rows)
    else:
        # PostgreSQL / generic
        row = conn.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ), {"t": table, "c": column}).fetchone()
        return row is not None

with engine.begin() as conn:
    if column_exists(conn, "bosses", "reward_count"):
        dialect = engine.dialect.name
        if dialect == "sqlite":
            # SQLite does not support RENAME COLUMN before 3.25.0; use ALTER TABLE … RENAME COLUMN (3.25+)
            conn.execute(text("ALTER TABLE bosses RENAME COLUMN reward_count TO reward_score"))
        else:
            conn.execute(text("ALTER TABLE bosses RENAME COLUMN reward_count TO reward_score"))
        print("[migrate] bosses.reward_count  →  bosses.reward_score  ✓")
    elif column_exists(conn, "bosses", "reward_score"):
        print("[migrate] bosses.reward_score already exists, skipping.")
    else:
        print("[migrate] Neither reward_count nor reward_score found — adding reward_score column.")
        conn.execute(text("ALTER TABLE bosses ADD COLUMN reward_score INTEGER DEFAULT 0"))
        print("[migrate] bosses.reward_score added ✓")
