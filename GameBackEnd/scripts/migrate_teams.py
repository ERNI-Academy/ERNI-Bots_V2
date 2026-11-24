"""
Migration: teams and team seasons (docs/specs/teams.md, §12.3).

  1. Creates the tables teams, team_membership_log and team_season_members.
  2. Adds the columns players.team_id, seasons.mode, seasons.first_activated_at,
     player_history_entries.team_id and prizes.winner_team_id.
  3. Creates the index idx_player_team.
  4. Backfills seasons.first_activated_at for seasons that were already played
     (active, finalized or with stats), so their mode can no longer be edited.
  5. Seeds the team settings in app_config (only missing keys).

Compatible with SQLite (dev) and PostgreSQL (Azure production).
Safe to run multiple times, and concurrently from GameBackEnd and AdminPanel
(PostgreSQL uses ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).

DUPLICATED in AdminPanel/scripts/migrate_teams.py — keep both copies identical.

Usage (from GameBackEnd/ or AdminPanel/):
    python scripts/migrate_teams.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from db import engine
from db.models import AppConfig, Team, TeamMembershipLog, TeamSeasonMember
from settings_registry import REGISTRY, serialize

NEW_TABLES = [Team.__table__, TeamMembershipLog.__table__, TeamSeasonMember.__table__]

# (table, column, column DDL). Identifiers are hardcoded constants, never user input.
NEW_COLUMNS = [
    ("players", "team_id", "VARCHAR REFERENCES teams(id)"),
    ("seasons", "mode", "VARCHAR(10) NOT NULL DEFAULT 'individual'"),
    ("seasons", "first_activated_at", "TIMESTAMP"),
    ("player_history_entries", "team_id", "VARCHAR REFERENCES teams(id)"),
    ("prizes", "winner_team_id", "VARCHAR REFERENCES teams(id)"),
]

TEAM_SETTING_KEYS = [
    "team_max_size",
    "team_creation_enabled",
    "team_joining_enabled",
    "team_leaving_enabled",
    "team_self_management_enabled",
]


def column_exists(conn, table: str, column: str) -> bool:
    if conn.dialect.name == "sqlite":
        result = conn.execute(text(f"PRAGMA table_info({table})"))  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text -- identifiers are hardcoded migration constants, not user input
        return any(row[1] == column for row in result)

    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """), {"table": table, "column": column})
    return result.fetchone() is not None


def add_column(conn, table: str, column: str, ddl: str) -> None:
    if conn.dialect.name == "postgresql":
        existed = column_exists(conn, table, column)
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl}"))  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text -- identifiers are hardcoded migration constants, not user input
    else:
        existed = column_exists(conn, table, column)
        if not existed:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text -- identifiers are hardcoded migration constants, not user input
    print(f"– Already exists: {table}.{column}" if existed else f"✓ Added column: {table}.{column}")


def run():
    with engine.begin() as conn:
        # 1. New tables (and their indexes, including the partial unique ones)
        for table in NEW_TABLES:
            table.create(bind=conn, checkfirst=True)
        print("✓ Tables ensured: " + ", ".join(t.name for t in NEW_TABLES))

        # 2. New columns on existing tables
        for table, column, ddl in NEW_COLUMNS:
            add_column(conn, table, column, ddl)

        # 3. Index on the current team of each player
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_player_team ON players (team_id)"))
        print("✓ Index ensured: idx_player_team")

        # 4. Seasons already played keep their mode fixed (RN-61)
        result = conn.execute(text("""
            UPDATE seasons
            SET first_activated_at = COALESCE(start_date, CURRENT_TIMESTAMP)
            WHERE first_activated_at IS NULL
              AND (
                    is_active = TRUE
                 OR finalized = TRUE
                 OR EXISTS (SELECT 1 FROM player_season_stats pss WHERE pss.season_id = seasons.id)
                 OR EXISTS (SELECT 1 FROM fortress_season_stats fss WHERE fss.season_id = seasons.id)
              )
        """))
        print(f"✓ Backfilled first_activated_at on {result.rowcount} season(s)")

        # 5. Team settings: insert missing keys, never overwrite existing values.
        #    ON CONFLICT DO NOTHING keeps it safe when both backends run it at once.
        insert = pg_insert if conn.dialect.name == "postgresql" else sqlite_insert
        inserted = 0
        for key in TEAM_SETTING_KEYS:
            setting = REGISTRY[key]
            value = serialize(setting, setting.default)
            result = conn.execute(
                insert(AppConfig.__table__)
                .values(key=key, value=value, description=setting.description)
                .on_conflict_do_nothing(index_elements=["key"])
            )
            if result.rowcount:
                inserted += 1
                print(f"  + Inserted config key='{key}' value='{value}'")
        print(f"✓ Team settings ensured ({inserted} inserted)")

    print("Migration complete.")


if __name__ == "__main__":
    run()
