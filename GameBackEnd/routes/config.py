"""
GET /api/v1/config   – public, no auth required.

Returns the subset of AppConfig keys that the game frontend needs to
render its UI (e.g. feature flags).  Sensitive keys must never appear here.
"""

from flask import Blueprint, jsonify
from db import SessionLocal
from db.models import AppConfig

config_bp = Blueprint("config", __name__)

# Keys exposed publicly to the game frontend (allowlist)
PUBLIC_KEYS = {
    "invitations_enabled",
    "player_invitations_enabled",
}


@config_bp.get("/")
def get_public_config():
    """Return public feature flags as a flat dict with boolean-coerced values."""
    db = SessionLocal()
    try:
        rows = db.query(AppConfig).filter(AppConfig.key.in_(PUBLIC_KEYS)).all()
        result = {row.key: row.value.lower() == "true" for row in rows}
        # Fill defaults for any key not yet seeded
        for key in PUBLIC_KEYS:
            if key not in result:
                result[key] = True
        return jsonify(result), 200
    finally:
        db.close()
