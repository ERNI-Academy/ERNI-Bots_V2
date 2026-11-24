"""
GET /api/v1/config   – public, no auth required.

Returns the subset of AppConfig keys that the game frontend needs to
render its UI (e.g. feature flags).  Sensitive keys must never appear here.
"""

from flask import Blueprint, jsonify
from db import SessionLocal
from db.models import Season
from settings_registry import PUBLIC_KEYS, get_settings

config_bp = Blueprint("config", __name__)

def _get_season_info(db) -> dict:
    """
    Returns season status and, when frozen, the season's start_date as ISO string.
      'active'    – a season is active and not frozen
      'frozen'    – the active season is frozen (battles paused)
      'finalized' – no active season, but at least one is finalized
      'none'      – no seasons exist at all
    Also returns the active season's mode ('individual' | 'team'), or None.
    """
    active = db.query(Season).filter_by(is_active=True).first()
    if active:
        end_date = active.end_date.isoformat() if active.end_date else None
        if active.is_frozen:
            start_date = active.start_date.isoformat() if active.start_date else None
            return {"status": "frozen", "start_date": start_date, "end_date": end_date, "mode": active.mode}
        return {"status": "active", "start_date": None, "end_date": end_date, "mode": active.mode}
    from sqlalchemy import exists
    has_finalized = db.query(exists().where(Season.finalized == True)).scalar()  # noqa: E712
    return {
        "status": "finalized" if has_finalized else "none",
        "start_date": None,
        "end_date": None,
        "mode": None,
    }


@config_bp.get("/")
def get_public_config():
    """Return public typed settings and season status as a flat dict."""
    db = SessionLocal()
    try:
        result = get_settings(db, PUBLIC_KEYS)
        season_info = _get_season_info(db)
        result["season_status"] = season_info["status"]
        result["season_start_date"] = season_info["start_date"]
        result["season_end_date"] = season_info["end_date"]
        result["season_mode"] = season_info["mode"]
        return jsonify(result), 200
    finally:
        db.close()
