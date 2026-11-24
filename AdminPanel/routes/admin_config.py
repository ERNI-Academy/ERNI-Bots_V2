"""
Admin configuration endpoints.

GET  /api/v1/admin/config           – list all editable config entries (registry order)
PATCH /api/v1/admin/config/<key>    – update a config value

Editable keys, their types, defaults and bounds live in settings_registry.py.
Values travel as canonical strings ("true"/"false" for bools, "5" for ints);
each entry also carries its type, default and bounds so the UI can render it.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime

from db import SessionLocal
from db.models import AppConfig
from settings_registry import REGISTRY, SETTINGS, Setting, parse_stored, serialize, validate_input

admin_config_bp = Blueprint("admin_config", __name__)


def _check_admin():
    """Validate the X-Admin-Secret header."""
    import os
    secret = os.environ.get("ADMIN_SECRET", "")
    return request.headers.get("X-Admin-Secret") == secret and secret != ""


def _entry(setting: Setting, row: AppConfig | None) -> dict:
    return {
        "key": setting.key,
        "value": serialize(setting, parse_stored(setting, row.value if row else None)),
        "type": setting.type,
        "default": serialize(setting, setting.default),
        "min": setting.min,
        "max": setting.max,
        "description": (row.description if row and row.description else setting.description),
        "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
    }


# ──────────────────────────────────────────────────────────
# GET /config
# ──────────────────────────────────────────────────────────

@admin_config_bp.get("/config")
def list_config():
    """Return every editable config entry, in registry order."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        rows = db.query(AppConfig).filter(AppConfig.key.in_(list(REGISTRY))).all()
        existing = {row.key: row for row in rows}
        return jsonify([_entry(setting, existing.get(setting.key)) for setting in SETTINGS]), 200
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PATCH /config/<key>
# ──────────────────────────────────────────────────────────

@admin_config_bp.route("/config/<key>", methods=["PATCH"])
def update_config(key: str):
    """Update a config entry value.  Body: {"value": <bool|int|string>}"""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    setting = REGISTRY.get(key)
    if setting is None:
        return jsonify({"error": f"Config key '{key}' not found or not editable"}), 404

    data = request.get_json(silent=True) or {}
    if data.get("value") is None:
        return jsonify({"error": "'value' is required"}), 400
    try:
        new_value = validate_input(setting, data["value"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db = SessionLocal()
    try:
        row = db.get(AppConfig, key)
        if row is None:
            row = AppConfig(key=key, value=new_value, description=setting.description)
            db.add(row)
        else:
            row.value = new_value
            row.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(row)
        return jsonify(_entry(setting, row)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
