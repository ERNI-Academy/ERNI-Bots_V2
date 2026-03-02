"""
Admin boss management routes.

All endpoints require X-Admin-Secret header.
Includes full prompt and protected_word — admin eyes only.

GET    /api/v1/admin/bosses           List all bosses (full data including prompt)
GET    /api/v1/admin/bosses/<id>      Single boss detail
POST   /api/v1/admin/bosses           Create a boss
PUT    /api/v1/admin/bosses/<id>      Update any boss field (prompt, protected_word, etc.)
DELETE /api/v1/admin/bosses/<id>      Hard-delete a boss
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from db import SessionLocal
from db.models import Boss
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_bosses_bp = Blueprint("admin_bosses", __name__)


# ──────────────────────────────────────────────────────────
# Serializer
# ──────────────────────────────────────────────────────────

def _boss_to_dict(boss: Boss) -> dict:
    return {
        "id":             boss.id,
        "name":           boss.name,
        "title":          boss.title,
        "location":       boss.location,
        "story":          boss.story,
        "prompt":         boss.prompt,
        "protected_word": boss.protected_word,
        "reward_credits": boss.reward_credits,
        "reward_score":   boss.reward_score,
        "enabled":        boss.enabled,
        "active_at":      boss.active_at.isoformat() + "Z" if boss.active_at else None,
    }


def _parse_datetime(value: str) -> datetime:
    """Parse an ISO 8601 datetime string (with or without timezone)."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


# ──────────────────────────────────────────────────────────
# GET /bosses
# ──────────────────────────────────────────────────────────

@admin_bosses_bp.get("/bosses")
def list_bosses():
    """List all bosses (enabled and disabled), including prompt."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        bosses = (
            db.query(Boss)
            .order_by(Boss.active_at.asc().nullsfirst())
            .all()
        )
        return jsonify([_boss_to_dict(b) for b in bosses])
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /bosses/<id>
# ──────────────────────────────────────────────────────────

@admin_bosses_bp.get("/bosses/<boss_id>")
def get_boss(boss_id):
    """Single boss detail, including prompt."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        boss = db.query(Boss).filter_by(id=boss_id).first()
        if not boss:
            return jsonify({"error": "Boss not found"}), 404
        return jsonify(_boss_to_dict(boss))
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /bosses
# ──────────────────────────────────────────────────────────

@admin_bosses_bp.post("/bosses")
def create_boss():
    """
    POST body:
        {
            "name":           "...",              # required
            "story":          "...",              # required
            "prompt":         "...",              # required — system prompt
            "protected_word": "...",              # required
            "title":          "...",              # optional
            "location":       "...",              # optional
            "reward_credits": 0,                  # optional, default 0
            "enabled":        true,               # optional, default true
            "active_at":      "2026-06-01T00:00" # optional ISO 8601 datetime
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data           = request.get_json(silent=True) or {}
    name           = str(data.get("name") or "").strip()
    story          = str(data.get("story") or "").strip()
    prompt         = str(data.get("prompt") or "").strip()
    protected_word = str(data.get("protected_word") or "").strip()

    if not all([name, story, prompt, protected_word]):
        return jsonify({"error": "name, story, prompt and protected_word are required"}), 400

    active_at = None
    if data.get("active_at"):
        try:
            active_at = _parse_datetime(str(data["active_at"]))
        except ValueError:
            return jsonify({"error": "active_at must be a valid ISO 8601 datetime"}), 400

    db = SessionLocal()
    try:
        boss = Boss(
            name=name,
            title=str(data.get("title") or "").strip() or None,
            location=str(data.get("location") or "").strip() or None,
            story=story,
            prompt=prompt,
            protected_word=protected_word,
            reward_credits=int(data.get("reward_credits", 0)),
            reward_score=int(data.get("reward_score", 0)),
            enabled=bool(data.get("enabled", True)),
            active_at=active_at,
        )
        db.add(boss)
        db.commit()
        logger.info("admin: created boss id=%s name=%s", boss.id, boss.name)
        return jsonify(_boss_to_dict(boss)), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_boss failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /bosses/<id>
# ──────────────────────────────────────────────────────────

@admin_bosses_bp.put("/bosses/<boss_id>")
def update_boss(boss_id):
    """
    Partial update of any boss field.
    Pass only the fields you want to change.

    To disable a boss: {"enabled": false}
    To update the prompt: {"prompt": "new system prompt..."}
    To clear active_at: {"active_at": null}
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        boss = db.query(Boss).filter_by(id=boss_id).first()
        if not boss:
            return jsonify({"error": "Boss not found"}), 404

        for field in ("name", "title", "location", "story", "prompt", "protected_word"):
            if field in data:
                value = str(data[field]).strip() if data[field] is not None else None
                setattr(boss, field, value or None)

        if "reward_credits" in data:
            boss.reward_credits = int(data["reward_credits"])

        if "reward_score" in data:
            boss.reward_score = int(data["reward_score"])

        if "enabled" in data:
            boss.enabled = bool(data["enabled"])

        if "active_at" in data:
            if data["active_at"] is None:
                boss.active_at = None
            else:
                try:
                    boss.active_at = _parse_datetime(str(data["active_at"]))
                except ValueError:
                    return jsonify({"error": "active_at must be ISO 8601 or null"}), 400

        db.commit()
        logger.info("admin: updated boss id=%s", boss_id)
        return jsonify({"message": "Boss updated", "boss": _boss_to_dict(boss)})

    except ValueError:
        db.rollback()
        return jsonify({"error": "Invalid value"}), 400
    except Exception:
        db.rollback()
        logger.exception("admin: update_boss failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /bosses/<id>
# ──────────────────────────────────────────────────────────

@admin_bosses_bp.delete("/bosses/<boss_id>")
def delete_boss(boss_id):
    """
    Hard-delete a boss.
    To just hide it from players without deleting, use PUT with {"enabled": false}.
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        boss = db.query(Boss).filter_by(id=boss_id).first()
        if not boss:
            return jsonify({"error": "Boss not found"}), 404

        db.delete(boss)
        db.commit()
        logger.info("admin: deleted boss id=%s", boss_id)
        return jsonify({"message": "Boss deleted"})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_boss failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
