"""
Season lookups and atomic get-or-create of per-season stats rows.

Shared by routes/battles.py, routes/players.py and services/scoring.py
(these helpers used to be copied in each route module).
"""

import logging
from datetime import datetime

from sqlalchemy import text

from db import engine as db_engine
from db.models import FortressSeasonStats, PlayerSeasonStats, Season
from utils import generate_uuid

logger = logging.getLogger(__name__)


def get_active_season(db):
    return db.query(Season).filter_by(is_active=True).first()


def get_or_create_player_season_stats(db, player_id, season_id):
    """Atomically ensure a PlayerSeasonStats row exists and return it."""
    is_postgres = db_engine.dialect.name == "postgresql"
    new_id = generate_uuid()
    if is_postgres:
        sql = text("""
            INSERT INTO player_season_stats (id, player_id, season_id, score)
            VALUES (:id, :player_id, :season_id, 0)
            ON CONFLICT (player_id, season_id) DO NOTHING
        """)
    else:
        sql = text("""
            INSERT OR IGNORE INTO player_season_stats (id, player_id, season_id, score)
            VALUES (:id, :player_id, :season_id, 0)
        """)
    try:
        db.execute(sql, {"id": new_id, "player_id": player_id, "season_id": season_id})
    except Exception as exc:
        logger.exception("[season_stats] INSERT player_season_stats failed for player=%s season=%s: %s", player_id, season_id, exc)
        db.rollback()
    stats = db.query(PlayerSeasonStats).filter_by(
        player_id=player_id, season_id=season_id
    ).first()
    if stats is None:
        logger.error("[season_stats] player_season_stats still missing after INSERT for player=%s season=%s", player_id, season_id)
    return stats


def get_or_create_fortress_season_stats(db, fortress_id, season_id):
    """Atomically ensure a FortressSeasonStats row exists and return it."""
    is_postgres = db_engine.dialect.name == "postgresql"
    new_id = generate_uuid()
    now = datetime.utcnow().isoformat()
    if is_postgres:
        sql = text("""
            INSERT INTO fortress_season_stats (id, fortress_id, season_id, defeat_count, attack_count, status, created_at, updated_at)
            VALUES (:id, :fortress_id, :season_id, 0, 0, 'active', NOW(), NOW())
            ON CONFLICT (fortress_id, season_id) DO NOTHING
        """)
    else:
        sql = text("""
            INSERT OR IGNORE INTO fortress_season_stats (id, fortress_id, season_id, defeat_count, attack_count, status, created_at, updated_at)
            VALUES (:id, :fortress_id, :season_id, 0, 0, 'active', :now, :now)
        """)
    try:
        db.execute(sql, {"id": new_id, "fortress_id": fortress_id, "season_id": season_id, "now": now})
    except Exception as exc:
        logger.exception("[season_stats] INSERT fortress_season_stats failed for fortress=%s season=%s: %s", fortress_id, season_id, exc)
        db.rollback()
    stats = db.query(FortressSeasonStats).filter_by(
        fortress_id=fortress_id, season_id=season_id
    ).first()
    if stats is None:
        logger.error("[season_stats] fortress_season_stats still missing after INSERT for fortress=%s season=%s", fortress_id, season_id)
    return stats
