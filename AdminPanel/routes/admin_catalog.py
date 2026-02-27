"""
Admin catalog routes — CRUD for protocols, archetypes, constraints, personalities.

All endpoints require X-Admin-Secret header.

Protocols:
  POST   /api/v1/admin/protocols
  PUT    /api/v1/admin/protocols/<id>
  DELETE /api/v1/admin/protocols/<id>

Archetypes:
  POST   /api/v1/admin/archetypes
  PUT    /api/v1/admin/archetypes/<id>
  DELETE /api/v1/admin/archetypes/<id>

Constraint types:
  GET    /api/v1/admin/constraint-types
  POST   /api/v1/admin/constraint-types
  DELETE /api/v1/admin/constraint-types/<id>

Constraints:
  POST   /api/v1/admin/constraints
  PATCH  /api/v1/admin/constraints/<id>
  DELETE /api/v1/admin/constraints/<id>

Personalities:
  POST   /api/v1/admin/personalities
  PUT    /api/v1/admin/personalities/<id>
  DELETE /api/v1/admin/personalities/<id>
"""

import logging
import re
import unicodedata
import uuid

from flask import Blueprint, jsonify, request

from db import SessionLocal
from db.models import (
    Archetype,
    ConstraintType,
    Fortress,
    FortressConstraint,
    GameConstraint,
    Personality,
    Protocol,
)
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_catalog_bp = Blueprint("admin_catalog", __name__)


# ──────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    """Convert text to a URL-safe slug (ASCII, lowercase, hyphen-separated)."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


# ──────────────────────────────────────────────────────────
# PROTOCOLS CRUD
# ──────────────────────────────────────────────────────────

@admin_catalog_bp.post("/protocols")
def create_protocol():
    """
    POST body:
        {
            "id":                "protocolo-slug",  # optional, auto-generated
            "name":              "Protocol Name",   # required
            "description":       "...",             # required
            "protocol_template": "...",             # required — prompt fragment
            "unlock_cost":       0                  # optional, default 0
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data              = request.get_json(silent=True) or {}
    name              = str(data.get("name") or "").strip()
    description       = str(data.get("description") or "").strip()
    protocol_template = str(data.get("protocol_template") or "").strip()

    if not name or not description or not protocol_template:
        return jsonify({"error": "name, description and protocol_template are required"}), 400

    protocol_id  = str(data.get("id") or _slugify(name)) or None
    if not protocol_id:
        return jsonify({"error": "Could not generate a valid id from name"}), 400

    unlock_cost = int(data.get("unlock_cost", 0))

    db = SessionLocal()
    try:
        if db.query(Protocol).filter_by(id=protocol_id).first():
            return jsonify({"error": f"Protocol id '{protocol_id}' already exists"}), 409
        if db.query(Protocol).filter_by(name=name).first():
            return jsonify({"error": f"Protocol name '{name}' already exists"}), 409

        protocol = Protocol(
            id=protocol_id,
            name=name,
            description=description,
            protocol_template=protocol_template,
            unlock_cost=unlock_cost,
        )
        db.add(protocol)
        db.commit()
        logger.info("admin: created protocol id=%s", protocol_id)
        return jsonify({"id": protocol_id, "name": name}), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_protocol failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.put("/protocols/<protocol_id>")
def update_protocol(protocol_id):
    """Partial update. All body fields are optional."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        protocol = db.query(Protocol).filter_by(id=protocol_id).first()
        if not protocol:
            return jsonify({"error": "Protocol not found"}), 404

        if "name" in data:
            new_name = str(data["name"]).strip()
            if new_name and new_name != protocol.name:
                if db.query(Protocol).filter(
                    Protocol.name == new_name, Protocol.id != protocol_id
                ).first():
                    return jsonify({"error": "Name already in use"}), 409
                protocol.name = new_name

        if "description" in data:
            protocol.description = str(data["description"]).strip()
        if "protocol_template" in data:
            protocol.protocol_template = str(data["protocol_template"]).strip()
        if "unlock_cost" in data:
            protocol.unlock_cost = int(data["unlock_cost"])

        db.commit()
        logger.info("admin: updated protocol id=%s", protocol_id)
        return jsonify({"message": "Protocol updated", "id": protocol_id})

    except ValueError:
        db.rollback()
        return jsonify({"error": "Invalid value"}), 400
    except Exception:
        db.rollback()
        logger.exception("admin: update_protocol failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.delete("/protocols/<protocol_id>")
def delete_protocol(protocol_id):
    """Delete a protocol. Fails if any fortress is currently using it."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        protocol = db.query(Protocol).filter_by(id=protocol_id).first()
        if not protocol:
            return jsonify({"error": "Protocol not found"}), 404

        in_use = db.query(Fortress).filter_by(protocol_id=protocol_id).count()
        if in_use:
            return jsonify({"error": f"Protocol is in use by {in_use} fortress(es)"}), 409

        db.delete(protocol)
        db.commit()
        logger.info("admin: deleted protocol id=%s", protocol_id)
        return jsonify({"message": "Protocol deleted"})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_protocol failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# ARCHETYPES CRUD
# ──────────────────────────────────────────────────────────

@admin_catalog_bp.post("/archetypes")
def create_archetype():
    """
    POST body:
        {
            "id":                  "archetype-slug",  # optional
            "name":                "Archetype Name",  # required
            "description":         "...",             # required
            "archetype_template":  "...",             # required
            "unlock_cost":         0                  # optional
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data               = request.get_json(silent=True) or {}
    name               = str(data.get("name") or "").strip()
    description        = str(data.get("description") or "").strip()
    archetype_template = str(data.get("archetype_template") or "").strip()

    if not name or not description or not archetype_template:
        return jsonify({"error": "name, description and archetype_template are required"}), 400

    archetype_id = str(data.get("id") or _slugify(name)) or None
    if not archetype_id:
        return jsonify({"error": "Could not generate a valid id from name"}), 400

    unlock_cost = int(data.get("unlock_cost", 0))

    db = SessionLocal()
    try:
        if db.query(Archetype).filter_by(id=archetype_id).first():
            return jsonify({"error": f"Archetype id '{archetype_id}' already exists"}), 409
        if db.query(Archetype).filter_by(name=name).first():
            return jsonify({"error": f"Archetype name '{name}' already exists"}), 409

        archetype = Archetype(
            id=archetype_id,
            name=name,
            description=description,
            archetype_template=archetype_template,
            unlock_cost=unlock_cost,
        )
        db.add(archetype)
        db.commit()
        logger.info("admin: created archetype id=%s", archetype_id)
        return jsonify({"id": archetype_id, "name": name}), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_archetype failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.put("/archetypes/<archetype_id>")
def update_archetype(archetype_id):
    """Partial update. All body fields are optional."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        archetype = db.query(Archetype).filter_by(id=archetype_id).first()
        if not archetype:
            return jsonify({"error": "Archetype not found"}), 404

        if "name" in data:
            new_name = str(data["name"]).strip()
            if new_name and new_name != archetype.name:
                if db.query(Archetype).filter(
                    Archetype.name == new_name, Archetype.id != archetype_id
                ).first():
                    return jsonify({"error": "Name already in use"}), 409
                archetype.name = new_name

        if "description" in data:
            archetype.description = str(data["description"]).strip()
        if "archetype_template" in data:
            archetype.archetype_template = str(data["archetype_template"]).strip()
        if "unlock_cost" in data:
            archetype.unlock_cost = int(data["unlock_cost"])

        db.commit()
        logger.info("admin: updated archetype id=%s", archetype_id)
        return jsonify({"message": "Archetype updated", "id": archetype_id})

    except ValueError:
        db.rollback()
        return jsonify({"error": "Invalid value"}), 400
    except Exception:
        db.rollback()
        logger.exception("admin: update_archetype failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.delete("/archetypes/<archetype_id>")
def delete_archetype(archetype_id):
    """Delete an archetype. Fails if any fortress is using it."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        archetype = db.query(Archetype).filter_by(id=archetype_id).first()
        if not archetype:
            return jsonify({"error": "Archetype not found"}), 404

        in_use = db.query(Fortress).filter_by(archetype_id=archetype_id).count()
        if in_use:
            return jsonify({"error": f"Archetype is in use by {in_use} fortress(es)"}), 409

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


# ──────────────────────────────────────────────────────────
# CONSTRAINT TYPES
# ──────────────────────────────────────────────────────────

@admin_catalog_bp.get("/constraint-types")
def list_constraint_types():
    """List all constraint types."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        types = db.query(ConstraintType).order_by(ConstraintType.name).all()
        return jsonify([{"id": t.id, "name": t.name} for t in types])
    finally:
        db.close()


@admin_catalog_bp.post("/constraint-types")
def create_constraint_type():
    """
    POST body: {"name": "type-name"}
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    db = SessionLocal()
    try:
        if db.query(ConstraintType).filter_by(name=name).first():
            return jsonify({"error": "Constraint type already exists"}), 409

        ct = ConstraintType(id=str(uuid.uuid4()), name=name)
        db.add(ct)
        db.commit()
        logger.info("admin: created constraint type id=%s name=%s", ct.id, name)
        return jsonify({"id": ct.id, "name": ct.name}), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_constraint_type failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.delete("/constraint-types/<type_id>")
def delete_constraint_type(type_id):
    """Delete a constraint type. Fails if it still has constraints."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        ct = db.query(ConstraintType).filter_by(id=type_id).first()
        if not ct:
            return jsonify({"error": "Constraint type not found"}), 404

        count = db.query(GameConstraint).filter_by(type_id=type_id).count()
        if count:
            return jsonify({"error": f"Cannot delete: type has {count} constraint(s)"}), 409

        db.delete(ct)
        db.commit()
        return jsonify({"message": "Constraint type deleted"})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_constraint_type failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# CONSTRAINTS CRUD
# ──────────────────────────────────────────────────────────

@admin_catalog_bp.post("/constraints")
def create_constraint():
    """
    POST body:
        {
            "type_id": "...",   # required — ID of constraint type
            "text":    "...",   # required
            "price":   0        # optional
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data    = request.get_json(silent=True) or {}
    type_id = str(data.get("type_id") or "").strip()
    text    = str(data.get("text") or "").strip()
    price   = int(data.get("price", 0))

    if not type_id or not text:
        return jsonify({"error": "type_id and text are required"}), 400

    db = SessionLocal()
    try:
        if not db.query(ConstraintType).filter_by(id=type_id).first():
            return jsonify({"error": "Constraint type not found"}), 404

        if db.query(GameConstraint).filter_by(text=text).first():
            return jsonify({"error": "A constraint with this text already exists"}), 409

        constraint = GameConstraint(
            id=str(uuid.uuid4()),
            type_id=type_id,
            text=text,
            price=price,
        )
        db.add(constraint)
        db.commit()
        logger.info("admin: created constraint id=%s", constraint.id)
        return jsonify({"id": constraint.id, "text": text, "price": price}), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_constraint failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.patch("/constraints/<constraint_id>")
def update_constraint(constraint_id):
    """Partial update of text and/or price."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        constraint = db.query(GameConstraint).filter_by(id=constraint_id).first()
        if not constraint:
            return jsonify({"error": "Constraint not found"}), 404

        if "text" in data:
            new_text = str(data["text"]).strip()
            if new_text and new_text != constraint.text:
                if db.query(GameConstraint).filter(
                    GameConstraint.text == new_text,
                    GameConstraint.id != constraint_id,
                ).first():
                    return jsonify({"error": "Text already in use by another constraint"}), 409
                constraint.text = new_text

        if "price" in data:
            constraint.price = int(data["price"])

        db.commit()
        return jsonify({"message": "Constraint updated", "id": constraint_id})

    except ValueError:
        db.rollback()
        return jsonify({"error": "Invalid value"}), 400
    except Exception:
        db.rollback()
        logger.exception("admin: update_constraint failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.delete("/constraints/<constraint_id>")
def delete_constraint(constraint_id):
    """Delete a constraint and remove it from all fortresses."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        constraint = db.query(GameConstraint).filter_by(id=constraint_id).first()
        if not constraint:
            return jsonify({"error": "Constraint not found"}), 404

        # Remove junction rows first to avoid FK violation
        db.query(FortressConstraint).filter_by(constraint_id=constraint_id).delete()
        db.delete(constraint)
        db.commit()
        logger.info("admin: deleted constraint id=%s", constraint_id)
        return jsonify({"message": "Constraint deleted"})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_constraint failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PERSONALITIES CRUD
# ──────────────────────────────────────────────────────────

@admin_catalog_bp.post("/personalities")
def create_personality():
    """
    POST body:
        {
            "id":                    "personality-slug",  # optional
            "name":                  "Personality Name",  # required
            "description":           "...",               # required
            "personality_template":  "..."                # required
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data                 = request.get_json(silent=True) or {}
    name                 = str(data.get("name") or "").strip()
    description          = str(data.get("description") or "").strip()
    personality_template = str(data.get("personality_template") or "").strip()

    if not name or not description or not personality_template:
        return jsonify({"error": "name, description and personality_template are required"}), 400

    personality_id = str(data.get("id") or _slugify(name)) or None
    if not personality_id:
        return jsonify({"error": "Could not generate a valid id from name"}), 400

    db = SessionLocal()
    try:
        if db.query(Personality).filter_by(id=personality_id).first():
            return jsonify({"error": f"Personality id '{personality_id}' already exists"}), 409
        if db.query(Personality).filter_by(name=name).first():
            return jsonify({"error": f"Personality name '{name}' already exists"}), 409

        personality = Personality(
            id=personality_id,
            name=name,
            description=description,
            personality_template=personality_template,
        )
        db.add(personality)
        db.commit()
        logger.info("admin: created personality id=%s", personality_id)
        return jsonify({"id": personality_id, "name": name}), 201

    except Exception:
        db.rollback()
        logger.exception("admin: create_personality failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.put("/personalities/<personality_id>")
def update_personality(personality_id):
    """Partial update. All body fields are optional."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        personality = db.query(Personality).filter_by(id=personality_id).first()
        if not personality:
            return jsonify({"error": "Personality not found"}), 404

        if "name" in data:
            new_name = str(data["name"]).strip()
            if new_name and new_name != personality.name:
                if db.query(Personality).filter(
                    Personality.name == new_name,
                    Personality.id != personality_id,
                ).first():
                    return jsonify({"error": "Name already in use"}), 409
                personality.name = new_name

        if "description" in data:
            personality.description = str(data["description"]).strip()
        if "personality_template" in data:
            personality.personality_template = str(data["personality_template"]).strip()

        db.commit()
        logger.info("admin: updated personality id=%s", personality_id)
        return jsonify({"message": "Personality updated", "id": personality_id})

    except Exception:
        db.rollback()
        logger.exception("admin: update_personality failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_catalog_bp.delete("/personalities/<personality_id>")
def delete_personality(personality_id):
    """Delete a personality. Fails if any fortress is using it."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        personality = db.query(Personality).filter_by(id=personality_id).first()
        if not personality:
            return jsonify({"error": "Personality not found"}), 404

        in_use = db.query(Fortress).filter_by(personality_id=personality_id).count()
        if in_use:
            return jsonify({"error": f"Personality is in use by {in_use} fortress(es)"}), 409

        db.delete(personality)
        db.commit()
        logger.info("admin: deleted personality id=%s", personality_id)
        return jsonify({"message": "Personality deleted"})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_personality failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
