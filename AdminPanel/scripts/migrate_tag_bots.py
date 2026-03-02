"""
Migration: set tag = 'bot' on invitation_codes that belong to bot players.

Safe to re-run (idempotent): only updates rows where tag IS NULL or tag = ''.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.DATABASE_URL)

with engine.begin() as conn:
    result = conn.execute(text("""
        UPDATE invitation_codes
        SET tag = 'bot'
        WHERE player_id IN (
            SELECT id FROM players WHERE is_bot = TRUE
        )
        AND (tag IS NULL OR tag = '')
    """))
    print(f"invitation_codes.tag = 'bot' set on {result.rowcount} row(s) ✓")
