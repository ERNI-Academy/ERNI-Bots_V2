"""
Migration: create the app_config table and seed initial values.

Run once from the GameBackEnd directory:
    python -m scripts.migrate_app_config
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.base import Base
from db import engine, SessionLocal
from db.models import AppConfig


# ── Initial seed ──────────────────────────────────────────────────────────────
INITIAL_CONFIG: list[dict] = [
    {
        "key": "invitations_enabled",
        "value": "true",
        "description": (
            "Controls whether the [ GENERAR ] button is shown on the register page "
            "and the admin generate-code endpoint respects it."
        ),
    },
    {
        "key": "player_invitations_enabled",
        "value": "true",
        "description": (
            "Controls whether authenticated players can generate invitation codes "
            "for other users via POST /players/me/invitations."
        ),
    },
    {
        "key": "bot_fortresses_enabled",
        "value": "true",
        "description": (
            "Controls whether bot fortresses are active and can be attacked by players. "
            "When disabled, bot fortresses are hidden and no battles against them are allowed."
        ),
    },
]


def run():
    # 1. Create the table if it doesn't exist yet
    Base.metadata.create_all(bind=engine, tables=[AppConfig.__table__])
    print("[migrate_app_config] Table 'app_config' ensured.")

    # 2. Seed only missing keys (idempotent)
    db = SessionLocal()
    try:
        inserted = 0
        for entry in INITIAL_CONFIG:
            existing = db.get(AppConfig, entry["key"])
            if existing is None:
                db.add(AppConfig(**entry))
                inserted += 1
                print(f"  + Inserted  key='{entry['key']}' value='{entry['value']}'")
            else:
                print(f"  ~ Skipped   key='{entry['key']}' (already exists, value='{existing.value}')")
        db.commit()
        print(f"[migrate_app_config] Done. {inserted} row(s) inserted.")
    except Exception as exc:
        db.rollback()
        print(f"[migrate_app_config] ERROR: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
