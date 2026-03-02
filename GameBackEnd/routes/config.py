"""
GET /api/v1/config   – public, no auth required.

Returns the subset of AppConfig keys that the game frontend needs to
render its UI (e.g. feature flags).  Sensitive keys must never appear here.
"""

from flask import Blueprint, jsonify
from db import SessionLocal
from db.models import AppConfig, Season

config_bp = Blueprint("config", __name__)

# Keys exposed publicly to the game frontend (allowlist)
PUBLIC_KEYS = {
    "invitations_enabled",
    "player_invitations_enabled",
    "bot_fortresses_enabled",
}


def _get_season_info(db) -> dict:
    """
    Returns season status and, when frozen, the season's start_date as ISO string.
      'active'    – a season is active and not frozen
      'frozen'    – the active season is frozen (battles paused)
      'finalized' – no active season, but at least one is finalized
      'none'      – no seasons exist at all
    """
    active = db.query(Season).filter_by(is_active=True).first()
    if active:
        end_date = active.end_date.isoformat() if active.end_date else None
        if active.is_frozen:
            start_date = active.start_date.isoformat() if active.start_date else None
            return {"status": "frozen", "start_date": start_date, "end_date": end_date}
        return {"status": "active", "start_date": None, "end_date": end_date}
    from sqlalchemy import exists
    has_finalized = db.query(exists().where(Season.finalized == True)).scalar()  # noqa: E712
    return {"status": "finalized" if has_finalized else "none", "start_date": None, "end_date": None}


@config_bp.get("/")
def get_public_config():
    """Return public feature flags and season status as a flat dict."""
    db = SessionLocal()
    try:
        rows = db.query(AppConfig).filter(AppConfig.key.in_(PUBLIC_KEYS)).all()
        result = {row.key: row.value.lower() == "true" for row in rows}
        # Fill defaults for any key not yet seeded
        for key in PUBLIC_KEYS:
            if key not in result:
                result[key] = True
        season_info = _get_season_info(db)
        result["season_status"] = season_info["status"]
        result["season_start_date"] = season_info["start_date"]
        result["season_end_date"] = season_info["end_date"]
        return jsonify(result), 200
    finally:
        db.close()
