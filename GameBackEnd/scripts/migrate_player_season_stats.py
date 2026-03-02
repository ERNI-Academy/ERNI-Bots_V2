"""
Migration: ensure every player has a PlayerSeasonStats row for every season.

For each (player, season) pair that is missing a record, inserts one with
score = 0. Safe to run multiple times (idempotent).
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.DATABASE_URL)

with engine.begin() as conn:
    players = conn.execute(text("SELECT id FROM players")).fetchall()
    seasons = conn.execute(text("SELECT id FROM seasons")).fetchall()

    if not players:
        print("[migrate] No players found, nothing to do.")
    elif not seasons:
        print("[migrate] No seasons found, nothing to do.")
    else:
        created = 0
        for (player_id,) in players:
            for (season_id,) in seasons:
                existing = conn.execute(text(
                    "SELECT 1 FROM player_season_stats "
                    "WHERE player_id = :p AND season_id = :s"
                ), {"p": player_id, "s": season_id}).fetchone()

                if not existing:
                    conn.execute(text(
                        "INSERT INTO player_season_stats (id, player_id, season_id, score) "
                        "VALUES (:id, :p, :s, 0)"
                    ), {"id": str(uuid.uuid4()), "p": player_id, "s": season_id})
                    created += 1

        print(f"[migrate] Created {created} missing PlayerSeasonStats row(s) "
              f"({len(players)} player(s) × {len(seasons)} season(s)) ✓")

print("[migrate] Done.")
