"""
Admin archetype management routes.

All endpoints require X-Admin-Secret header.
Exposes the full archetype data (including archetype_template).

GET    /api/v1/admin/archetypes           List all archetypes
GET    /api/v1/admin/archetypes/<id>      Single archetype detail
POST   /api/v1/admin/archetypes           Create an archetype
PUT    /api/v1/admin/archetypes/<id>      Update any archetype field
DELETE /api/v1/admin/archetypes/<id>      Hard-delete an archetype
"""

import logging
import uuid

from flask import Blueprint, jsonify, request

from db import SessionLocal
from db.models import Archetype
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_archetypes_bp = Blueprint("admin_archetypes", __name__)


# ──────────────────────────────────────────────────────────
# Serializer
# ──────────────────────────────────────────────────────────

def _archetype_to_dict(a: Archetype) -> dict:
    return {
        "id":                 a.id,
        "name":               a.name,
        "description":        a.description,
        "archetype_template": a.archetype_template,
        "unlock_cost":        a.unlock_cost,
    }


# ──────────────────────────────────────────────────────────
# GET /archetypes
# ──────────────────────────────────────────────────────────

@admin_archetypes_bp.get("/archetypes")
def list_archetypes():
    """List all archetypes including archetype_template."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        archetypes = db.query(Archetype).order_by(Archetype.name).all()
        return jsonify([_archetype_to_dict(a) for a in archetypes])
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /archetypes/<id>
# ──────────────────────────────────────────────────────────

@admin_archetypes_bp.get("/archetypes/<archetype_id>")
def get_archetype(archetype_id):
    """Single archetype detail."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        archetype = db.query(Archetype).filter_by(id=archetype_id).first()
        if not archetype:
            return jsonify({"error": "Archetype not found"}), 404
        return jsonify(_archetype_to_dict(archetype))
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /archetypes
# ──────────────────────────────────────────────────────────

@admin_archetypes_bp.post("/archetypes")
def create_archetype():
    """
    POST body:
        {
            "name":               "...",   # required
            "description":        "...",   # required
            "archetype_template": "...",   # required — system prompt template
            "unlock_cost":        0        # optional, default 0
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data                = request.get_json(silent=True) or {}
    name                = str(data.get("name") or "").strip()
    description         = str(data.get("description") or "").strip()
    archetype_template  = str(data.get("archetype_template") or "").strip()

    if not all([name, description, archetype_template]):
        return jsonify({"error": "name, description and archetype_template are required"}), 400

    try:
        unlock_cost = int(data.get("unlock_cost", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "unlock_cost must be an integer"}), 400

    db = SessionLocal()
    try:
        archetype = Archetype(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            archetype_template=archetype_template,
            unlock_cost=unlock_cost,
        )
        db.add(archetype)
        db.commit()
        logger.info("admin: created archetype id=%s name=%s", archetype.id, archetype.name)
        return jsonify(_archetype_to_dict(archetype)), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_archetype failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /archetypes/<id>
# ──────────────────────────────────────────────────────────

@admin_archetypes_bp.put("/archetypes/<archetype_id>")
def update_archetype(archetype_id):
    """
    Partial update. Pass only the fields you want to change.
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        archetype = db.query(Archetype).filter_by(id=archetype_id).first()
        if not archetype:
            return jsonify({"error": "Archetype not found"}), 404

        for field in ("name", "description", "archetype_template"):
            if field in data:
                value = str(data[field]).strip() if data[field] is not None else ""
                if not value:
                    return jsonify({"error": f"{field} cannot be empty"}), 400
                setattr(archetype, field, value)

        if "unlock_cost" in data:
            try:
                archetype.unlock_cost = int(data["unlock_cost"])
            except (TypeError, ValueError):
                return jsonify({"error": "unlock_cost must be an integer"}), 400

        db.commit()
        logger.info("admin: updated archetype id=%s", archetype_id)
        return jsonify({"message": "Archetype updated", "archetype": _archetype_to_dict(archetype)})

    except Exception:
        db.rollback()
        logger.exception("admin: update_archetype failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /archetypes/<id>
# ──────────────────────────────────────────────────────────

@admin_archetypes_bp.delete("/archetypes/<archetype_id>")
def delete_archetype(archetype_id):
    """Hard-delete an archetype."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        archetype = db.query(Archetype).filter_by(id=archetype_id).first()
        if not archetype:
            return jsonify({"error": "Archetype not found"}), 404

        db.delete(archetype)
        db.commit()
        logger.info("admin: deleted archetype id=%s", archetype_id)
        return jsonify({"message": "Archetype deleted"})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_archetype failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
