"""
Migration: add secret_word column to battles table.

Stores a snapshot of the word the attacker must guess at the moment the
battle is created, so it never changes even if the fortress/boss is
reconfigured mid-battle and the admin panel can read it directly.

Backfill strategy for existing rows:
  - PvP: copy fortress.protected_word
  - PvE: copy player_boss_stats.assigned_word, falling back to boss.protected_word

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
    # ── Step 1: add the column ─────────────────────────────────────────────
    if column_exists(conn, "battles", "secret_word"):
        print("[migrate] battles.secret_word already exists, skipping DDL.")
    else:
        conn.execute(text("ALTER TABLE battles ADD COLUMN secret_word VARCHAR(100)"))
        print("[migrate] battles.secret_word added ✓")

    # ── Step 2: backfill PvP battles ───────────────────────────────────────
    pvp_updated = conn.execute(text("""
        UPDATE battles
        SET secret_word = (
            SELECT f.protected_word
            FROM fortresses f
            WHERE f.id = battles.fortress_id
        )
        WHERE type = 'pvp'
          AND fortress_id IS NOT NULL
          AND secret_word IS NULL
    """)).rowcount
    print(f"[migrate] PvP battles backfilled: {pvp_updated} row(s) ✓")

    # ── Step 3: backfill PvE battles from player_boss_stats.assigned_word ──
    pve_updated = conn.execute(text("""
        UPDATE battles
        SET secret_word = (
            SELECT pbs.assigned_word
            FROM player_boss_stats pbs
            WHERE pbs.player_id = battles.attacker_id
              AND pbs.boss_id   = battles.boss_id
              AND pbs.assigned_word IS NOT NULL
        )
        WHERE type = 'pve'
          AND boss_id IS NOT NULL
          AND secret_word IS NULL
    """)).rowcount
    print(f"[migrate] PvE battles backfilled (assigned_word): {pve_updated} row(s) ✓")

    # ── Step 4: fallback PvE → boss.protected_word ─────────────────────────
    pve_fallback = conn.execute(text("""
        UPDATE battles
        SET secret_word = (
            SELECT b.protected_word
            FROM bosses b
            WHERE b.id = battles.boss_id
        )
        WHERE type = 'pve'
          AND boss_id IS NOT NULL
          AND secret_word IS NULL
    """)).rowcount
    print(f"[migrate] PvE battles backfilled (boss fallback): {pve_fallback} row(s) ✓")

print("[migrate] Done.")
