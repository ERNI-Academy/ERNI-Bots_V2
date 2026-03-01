"""
Admin protocol management routes.

All endpoints require X-Admin-Secret header.
Exposes the full protocol data (including protocol_template).

GET    /api/v1/admin/protocols           List all protocols
GET    /api/v1/admin/protocols/<id>      Single protocol detail
POST   /api/v1/admin/protocols           Create a protocol
PUT    /api/v1/admin/protocols/<id>      Update any protocol field
DELETE /api/v1/admin/protocols/<id>      Hard-delete a protocol
"""

import logging
import uuid

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from db.models import Protocol, Fortress
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_protocols_bp = Blueprint("admin_protocols", __name__)


# ──────────────────────────────────────────────────────────
# Serializer
# ──────────────────────────────────────────────────────────

def _protocol_to_dict(p: Protocol) -> dict:
    return {
        "id":                p.id,
        "name":              p.name,
        "description":       p.description,
        "protocol_template": p.protocol_template,
        "unlock_cost":       p.unlock_cost,
    }


# ──────────────────────────────────────────────────────────
# GET /protocols
# ──────────────────────────────────────────────────────────

@admin_protocols_bp.get("/protocols")
def list_protocols():
    """List all protocols including protocol_template."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        protocols = db.query(Protocol).order_by(Protocol.name).all()
        return jsonify([_protocol_to_dict(p) for p in protocols])
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /protocols/<id>
# ──────────────────────────────────────────────────────────

@admin_protocols_bp.get("/protocols/<protocol_id>")
def get_protocol(protocol_id):
    """Single protocol detail."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        protocol = db.query(Protocol).filter_by(id=protocol_id).first()
        if not protocol:
            return jsonify({"error": "Protocol not found"}), 404
        return jsonify(_protocol_to_dict(protocol))
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /protocols
# ──────────────────────────────────────────────────────────

@admin_protocols_bp.post("/protocols")
def create_protocol():
    """
    POST body:
        {
            "name":              "...",   # required
            "description":       "...",   # required
            "protocol_template": "...",   # required — system prompt template
            "unlock_cost":       0        # optional, default 0
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data               = request.get_json(silent=True) or {}
    name               = str(data.get("name") or "").strip()
    description        = str(data.get("description") or "").strip()
    protocol_template  = str(data.get("protocol_template") or "").strip()

    if not all([name, description, protocol_template]):
        return jsonify({"error": "name, description and protocol_template are required"}), 400

    try:
        unlock_cost = int(data.get("unlock_cost", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "unlock_cost must be an integer"}), 400

    db = SessionLocal()
    try:
        protocol = Protocol(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            protocol_template=protocol_template,
            unlock_cost=unlock_cost,
        )
        db.add(protocol)
        db.commit()
        logger.info("admin: created protocol id=%s name=%s", protocol.id, protocol.name)
        return jsonify(_protocol_to_dict(protocol)), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_protocol failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /protocols/<id>
# ──────────────────────────────────────────────────────────

@admin_protocols_bp.put("/protocols/<protocol_id>")
def update_protocol(protocol_id):
    """
    Partial update. Pass only the fields you want to change.
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        protocol = db.query(Protocol).filter_by(id=protocol_id).first()
        if not protocol:
            return jsonify({"error": "Protocol not found"}), 404

        for field in ("name", "description", "protocol_template"):
            if field in data:
                value = str(data[field]).strip() if data[field] is not None else ""
                if not value:
                    return jsonify({"error": f"{field} cannot be empty"}), 400
                setattr(protocol, field, value)

        if "unlock_cost" in data:
            try:
                protocol.unlock_cost = int(data["unlock_cost"])
            except (TypeError, ValueError):
                return jsonify({"error": "unlock_cost must be an integer"}), 400

        db.commit()
        logger.info("admin: updated protocol id=%s", protocol_id)
        return jsonify({"message": "Protocol updated", "protocol": _protocol_to_dict(protocol)})

    except Exception:
        db.rollback()
        logger.exception("admin: update_protocol failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /protocols/<id>
# ──────────────────────────────────────────────────────────

@admin_protocols_bp.delete("/protocols/<protocol_id>")
def delete_protocol(protocol_id):
    """Hard-delete a protocol. Blocked if any fortress still references it."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        protocol = db.query(Protocol).filter_by(id=protocol_id).first()
        if not protocol:
            return jsonify({"error": "Protocol not found"}), 404

        # Guard: fortresses reference this protocol with a non-nullable FK
        fortress_count = db.query(Fortress).filter_by(protocol_id=protocol_id).count()
        if fortress_count > 0:
            return jsonify({
                "error": f"No se puede eliminar: {fortress_count} fortaleza{'s' if fortress_count != 1 else ''} "
                         f"{'usan' if fortress_count != 1 else 'usa'} este protocolo. "
                         "Reconfigura o elimina esas fortalezas primero."
            }), 409

        db.delete(protocol)
        db.commit()
        logger.info("admin: deleted protocol id=%s", protocol_id)
        return jsonify({"message": "Protocol deleted"})

    except IntegrityError:
        db.rollback()
        return jsonify({"error": "No se puede eliminar: existen registros que dependen de este protocolo."}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: delete_protocol failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
