"""
Admin personality management routes.

All endpoints require X-Admin-Secret header.
Exposes the full personality data (including personality_template).

GET    /api/v1/admin/personalities           List all personalities
GET    /api/v1/admin/personalities/<id>      Single personality detail
POST   /api/v1/admin/personalities           Create a personality
PUT    /api/v1/admin/personalities/<id>      Update any personality field
DELETE /api/v1/admin/personalities/<id>      Hard-delete a personality
"""

import logging
import uuid

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from db.models import Personality, Fortress
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_personalities_bp = Blueprint("admin_personalities", __name__)


# ──────────────────────────────────────────────────────────
# Serializer
# ──────────────────────────────────────────────────────────

def _personality_to_dict(p: Personality) -> dict:
    return {
        "id":                    p.id,
        "name":                  p.name,
        "description":           p.description,
        "personality_template":  p.personality_template,
    }


# ──────────────────────────────────────────────────────────
# GET /personalities
# ──────────────────────────────────────────────────────────

@admin_personalities_bp.get("/personalities")
def list_personalities():
    """List all personalities including personality_template."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        personalities = db.query(Personality).order_by(Personality.name).all()
        return jsonify([_personality_to_dict(p) for p in personalities])
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /personalities/<id>
# ──────────────────────────────────────────────────────────

@admin_personalities_bp.get("/personalities/<personality_id>")
def get_personality(personality_id):
    """Single personality detail."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        personality = db.query(Personality).filter_by(id=personality_id).first()
        if not personality:
            return jsonify({"error": "Personality not found"}), 404
        return jsonify(_personality_to_dict(personality))
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /personalities
# ──────────────────────────────────────────────────────────

@admin_personalities_bp.post("/personalities")
def create_personality():
    """
    POST body:
        {
            "name":                 "...",  # required
            "description":          "...",  # required
            "personality_template": "..."   # required — system prompt template
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data                 = request.get_json(silent=True) or {}
    name                 = str(data.get("name") or "").strip()
    description          = str(data.get("description") or "").strip()
    personality_template = str(data.get("personality_template") or "").strip()

    if not all([name, description, personality_template]):
        return jsonify({"error": "name, description and personality_template are required"}), 400

    db = SessionLocal()
    try:
        personality = Personality(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            personality_template=personality_template,
        )
        db.add(personality)
        db.commit()
        logger.info("admin: created personality id=%s name=%s", personality.id, personality.name)
        return jsonify(_personality_to_dict(personality)), 201

    except IntegrityError:
        db.rollback()
        return jsonify({"error": f"Ya existe una personalidad con el nombre '{name}'"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: create_personality failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /personalities/<id>
# ──────────────────────────────────────────────────────────

@admin_personalities_bp.put("/personalities/<personality_id>")
def update_personality(personality_id):
    """Partial update. Pass only the fields you want to change."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        personality = db.query(Personality).filter_by(id=personality_id).first()
        if not personality:
            return jsonify({"error": "Personality not found"}), 404

        for field in ("name", "description", "personality_template"):
            if field in data:
                value = str(data[field]).strip() if data[field] is not None else ""
                if not value:
                    return jsonify({"error": f"{field} cannot be empty"}), 400
                setattr(personality, field, value)

        db.commit()
        logger.info("admin: updated personality id=%s", personality_id)
        return jsonify({"message": "Personality updated", "personality": _personality_to_dict(personality)})

    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Ya existe una personalidad con ese nombre"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: update_personality failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /personalities/<id>
# ──────────────────────────────────────────────────────────

@admin_personalities_bp.delete("/personalities/<personality_id>")
def delete_personality(personality_id):
    """Hard-delete a personality."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        personality = db.query(Personality).filter_by(id=personality_id).first()
        if not personality:
            return jsonify({"error": "Personality not found"}), 404

        # Check for fortresses referencing this personality
        fortress_count = db.query(Fortress).filter_by(personality_id=personality_id).count()
        if fortress_count > 0:
            return jsonify({
                "error": (
                    f"No se puede eliminar: {fortress_count} "
                    f"fortaleza{'s' if fortress_count != 1 else ''} "
                    f"{'usan' if fortress_count != 1 else 'usa'} esta personalidad. "
                    "Reconfigura o elimina esas fortalezas primero."
                )
            }), 409

        db.delete(personality)
        db.commit()
        logger.info("admin: deleted personality id=%s", personality_id)
        return jsonify({"message": "Personality deleted"})

    except IntegrityError:
        db.rollback()
        return jsonify({"error": "No se puede eliminar: existen registros que dependen de esta personalidad."}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: delete_personality failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
