"""
Migration: add per-player assigned_word to player_boss_stats.

Instead of every player sharing the same boss.protected_word (which enables
flag sharing), each player is now assigned a unique random word from the
protected_words table the first time they start a boss fight.

This migration:
  1. Adds the nullable column `assigned_word` to `player_boss_stats`.
  2. Retroactively assigns a random ProtectedWord to any existing rows that
     have `defeated = True` (purely for historical completeness; those rows
     are already closed so the word is never used again in combat).

Safe to run multiple times (idempotent). Supports SQLite and PostgreSQL.
"""
import os
import sys
import random

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
    # ── Step 1: add the column if missing ─────────────────────────────────
    if column_exists(conn, "player_boss_stats", "assigned_word"):
        print("[migrate] player_boss_stats.assigned_word already exists, skipping DDL.")
    else:
        conn.execute(text(
            "ALTER TABLE player_boss_stats ADD COLUMN assigned_word VARCHAR(100)"
        ))
        print("[migrate] player_boss_stats.assigned_word added ✓")

    # ── Step 2: backfill existing rows with a random word ─────────────────
    words = conn.execute(text("SELECT word FROM protected_words")).fetchall()
    if not words:
        print("[migrate] No protected_words found — skipping backfill.")
    else:
        word_list = [row[0] for row in words]
        rows_to_fill = conn.execute(text(
            "SELECT id FROM player_boss_stats WHERE assigned_word IS NULL"
        )).fetchall()

        if not rows_to_fill:
            print("[migrate] No rows need backfilling.")
        else:
            dialect = engine.dialect.name
            for (row_id,) in rows_to_fill:
                chosen = random.choice(word_list)
                if dialect == "sqlite":
                    conn.execute(text(
                        "UPDATE player_boss_stats SET assigned_word = :w WHERE id = :id"
                    ), {"w": chosen, "id": row_id})
                else:
                    conn.execute(text(
                        "UPDATE player_boss_stats SET assigned_word = :w WHERE id = :id"
                    ), {"w": chosen, "id": row_id})
            print(f"[migrate] Backfilled {len(rows_to_fill)} row(s) with random words ✓")

print("[migrate] Done.")
