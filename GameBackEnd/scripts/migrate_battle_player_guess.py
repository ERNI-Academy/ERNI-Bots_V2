"""
Migration: add player_guess column to battles table.

Idempotent — safe to run multiple times.
Records the word the player submitted when making their guess attempt.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db import SessionLocal

def run():
    db = SessionLocal()
    conn = db.connection()
    raw  = conn.connection

    cursor = raw.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(battles)")
    columns = [row[1] for row in cursor.fetchall()]

    if "player_guess" not in columns:
        print("[migrate_battle_player_guess] Adding player_guess column to battles...")
        cursor.execute("ALTER TABLE battles ADD COLUMN player_guess VARCHAR(200)")
        raw.commit()
        print("[migrate_battle_player_guess] Done.")
    else:
        print("[migrate_battle_player_guess] player_guess column already exists, skipping.")

    db.close()

if __name__ == "__main__":
    run()
