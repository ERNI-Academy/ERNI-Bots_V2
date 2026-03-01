"""
Admin constraint management routes.

All endpoints require X-Admin-Secret header.

--- Constraint Types ---
GET    /api/v1/admin/constraints/types              List all types
POST   /api/v1/admin/constraints/types              Create a type
PUT    /api/v1/admin/constraints/types/<id>         Rename a type
DELETE /api/v1/admin/constraints/types/<id>         Delete a type (blocked if has constraints)

--- Game Constraints ---
GET    /api/v1/admin/constraints                    List all (grouped by type)
POST   /api/v1/admin/constraints                    Create a constraint
PUT    /api/v1/admin/constraints/<id>               Update a constraint
DELETE /api/v1/admin/constraints/<id>               Delete (blocked if used by a fortress)
"""

import logging

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from db.models import ConstraintType, GameConstraint, FortressConstraint
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_constraints_bp = Blueprint("admin_constraints", __name__)


# ──────────────────────────────────────────────────────────
# Serializers
# ──────────────────────────────────────────────────────────

def _type_to_dict(ct: ConstraintType) -> dict:
    return {"id": ct.id, "name": ct.name}


def _constraint_to_dict(c: GameConstraint) -> dict:
    return {
        "id":      c.id,
        "type_id": c.type_id,
        "text":    c.text,
        "price":   c.price,
    }


# ──────────────────────────────────────────────────────────
# GET /constraints  (grouped)
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.get("/constraints")
def list_constraints():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        types = db.query(ConstraintType).order_by(ConstraintType.name).all()
        result = []
        for ct in types:
            items = (
                db.query(GameConstraint)
                .filter_by(type_id=ct.id)
                .order_by(GameConstraint.text)
                .all()
            )
            result.append({
                "id":          ct.id,
                "name":        ct.name,
                "constraints": [_constraint_to_dict(c) for c in items],
            })
        return jsonify(result)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /constraints/types
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.get("/constraints/types")
def list_types():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        types = db.query(ConstraintType).order_by(ConstraintType.name).all()
        return jsonify([_type_to_dict(t) for t in types])
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /constraints/types
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.post("/constraints/types")
def create_type():
    """Body: { "name": "..." }"""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    db = SessionLocal()
    try:
        ct = ConstraintType(name=name)
        db.add(ct)
        db.commit()
        logger.info("admin: created constraint type id=%s name=%s", ct.id, ct.name)
        return jsonify(_type_to_dict(ct)), 201
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Ya existe un tipo con ese nombre"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: create_type failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /constraints/types/<id>
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.put("/constraints/types/<type_id>")
def update_type(type_id):
    """Body: { "name": "..." }"""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    db = SessionLocal()
    try:
        ct = db.query(ConstraintType).filter_by(id=type_id).first()
        if not ct:
            return jsonify({"error": "Constraint type not found"}), 404
        ct.name = name
        db.commit()
        logger.info("admin: updated constraint type id=%s", type_id)
        return jsonify({"message": "Type updated", "type": _type_to_dict(ct)})
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Ya existe un tipo con ese nombre"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: update_type failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /constraints/types/<id>
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.delete("/constraints/types/<type_id>")
def delete_type(type_id):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        ct = db.query(ConstraintType).filter_by(id=type_id).first()
        if not ct:
            return jsonify({"error": "Constraint type not found"}), 404

        count = db.query(GameConstraint).filter_by(type_id=type_id).count()
        if count > 0:
            return jsonify({
                "error": f"No se puede eliminar: este tipo tiene {count} restriccion{'es' if count != 1 else ''}. "
                         "Elimina sus restricciones primero."
            }), 409

        db.delete(ct)
        db.commit()
        logger.info("admin: deleted constraint type id=%s", type_id)
        return jsonify({"message": "Constraint type deleted"})
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "No se puede eliminar: existen registros que dependen de este tipo."}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: delete_type failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /constraints
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.post("/constraints")
def create_constraint():
    """Body: { "type_id": "...", "text": "...", "price": 0 }"""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data    = request.get_json(silent=True) or {}
    type_id = str(data.get("type_id") or "").strip()
    text    = str(data.get("text") or "").strip()

    if not all([type_id, text]):
        return jsonify({"error": "type_id and text are required"}), 400

    try:
        price = int(data.get("price", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "price must be an integer"}), 400

    db = SessionLocal()
    try:
        if not db.query(ConstraintType).filter_by(id=type_id).first():
            return jsonify({"error": "Constraint type not found"}), 404

        c = GameConstraint(type_id=type_id, text=text, price=price)
        db.add(c)
        db.commit()
        logger.info("admin: created constraint id=%s", c.id)
        return jsonify(_constraint_to_dict(c)), 201
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Ya existe una restriccion con ese texto"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: create_constraint failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /constraints/<id>
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.put("/constraints/<constraint_id>")
def update_constraint(constraint_id):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        c = db.query(GameConstraint).filter_by(id=constraint_id).first()
        if not c:
            return jsonify({"error": "Constraint not found"}), 404

        if "text" in data:
            text = str(data["text"]).strip()
            if not text:
                return jsonify({"error": "text cannot be empty"}), 400
            c.text = text

        if "price" in data:
            try:
                c.price = int(data["price"])
            except (TypeError, ValueError):
                return jsonify({"error": "price must be an integer"}), 400

        if "type_id" in data:
            type_id = str(data["type_id"]).strip()
            if not db.query(ConstraintType).filter_by(id=type_id).first():
                return jsonify({"error": "Constraint type not found"}), 404
            c.type_id = type_id

        db.commit()
        logger.info("admin: updated constraint id=%s", constraint_id)
        return jsonify({"message": "Constraint updated", "constraint": _constraint_to_dict(c)})
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Ya existe una restriccion con ese texto"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: update_constraint failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /constraints/<id>
# ──────────────────────────────────────────────────────────

@admin_constraints_bp.delete("/constraints/<constraint_id>")
def delete_constraint(constraint_id):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        c = db.query(GameConstraint).filter_by(id=constraint_id).first()
        if not c:
            return jsonify({"error": "Constraint not found"}), 404

        fortress_count = db.query(FortressConstraint).filter_by(constraint_id=constraint_id).count()
        if fortress_count > 0:
            return jsonify({
                "error": f"No se puede eliminar: {fortress_count} fortaleza{'s' if fortress_count != 1 else ''} "
                         f"{'usan' if fortress_count != 1 else 'usa'} esta restriccion. "
                         "Quita la restriccion de esas fortalezas primero."
            }), 409

        db.delete(c)
        db.commit()
        logger.info("admin: deleted constraint id=%s", constraint_id)
        return jsonify({"message": "Constraint deleted"})
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "No se puede eliminar: existen registros que dependen de esta restriccion."}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: delete_constraint failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
