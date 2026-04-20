from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import SessionLocal
from db.models import Archetype

archetypes_bp = Blueprint("archetypes", __name__)


# ==========================
# GET ALL ARCHETYPES
# ==========================

@archetypes_bp.get("")
@jwt_required()
def get_all_archetypes():
    db = SessionLocal()

    archetypes = db.query(Archetype).order_by(Archetype.unlock_cost).all()

    result = []
    for a in archetypes:
        result.append({
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "unlock_cost": a.unlock_cost
        })

    db.close()
    return jsonify(result)


# ==========================
# GET ARCHETYPE BY ID
# ==========================

@archetypes_bp.get("/<archetype_id>")
@jwt_required()
def get_archetype_by_id(archetype_id):
    db = SessionLocal()

    archetype = db.query(Archetype).filter_by(id=archetype_id).first()
    if not archetype:
        db.close()
        return jsonify({"error": "Archetype not found"}), 404

    result = {
        "id": archetype.id,
        "name": archetype.name,
        "description": archetype.description,
        "unlock_cost": archetype.unlock_cost
    }

    db.close()
    return jsonify(result)
