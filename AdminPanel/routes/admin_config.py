"""
Admin configuration endpoints.

GET  /api/v1/admin/config           – list all config entries
PATCH /api/v1/admin/config/<key>    – update a config value
"""

from flask import Blueprint, jsonify, request
from datetime import datetime

from db import SessionLocal
from db.models import AppConfig

admin_config_bp = Blueprint("admin_config", __name__)

# Keys that admins are allowed to read/write via this API (allowlist)
ALLOWED_KEYS = {
    "invitations_enabled",
    "player_invitations_enabled",
    "bot_fortresses_enabled",
}


def _check_admin():
    """Validate the X-Admin-Secret header."""
    import os
    secret = os.environ.get("ADMIN_SECRET", "")
    return request.headers.get("X-Admin-Secret") == secret and secret != ""


# ──────────────────────────────────────────────────────────
# GET /config
# ──────────────────────────────────────────────────────────

@admin_config_bp.get("/config")
def list_config():
    """Return all allowed config entries."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        rows = db.query(AppConfig).filter(AppConfig.key.in_(ALLOWED_KEYS)).all()
        existing = {row.key: row for row in rows}
        result = []
        for key in ALLOWED_KEYS:
            if key in existing:
                row = existing[key]
                result.append({
                    "key": row.key,
                    "value": row.value,
                    "description": row.description,
                    "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                })
            else:
                # Key not seeded yet — return default
                result.append({
                    "key": key,
                    "value": "true",
                    "description": None,
                    "updated_at": None,
                })
        return jsonify(result), 200
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PATCH /config/<key>
# ──────────────────────────────────────────────────────────

@admin_config_bp.route("/config/<key>", methods=["PATCH"])
def update_config(key: str):
    """Update a config entry value.  Body: {"value": "true"|"false"}"""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    if key not in ALLOWED_KEYS:
        return jsonify({"error": f"Config key '{key}' not found or not editable"}), 404

    data = request.get_json(silent=True) or {}
    new_value = data.get("value")
    if new_value is None:
        return jsonify({"error": "'value' is required"}), 400
    new_value = str(new_value).strip().lower()
    if new_value not in ("true", "false"):
        return jsonify({"error": "'value' must be 'true' or 'false'"}), 400

    db = SessionLocal()
    try:
        row = db.get(AppConfig, key)
        if row is None:
            row = AppConfig(key=key, value=new_value)
            db.add(row)
        else:
            row.value = new_value
            row.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(row)
        return jsonify({
            "key": row.key,
            "value": row.value,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
