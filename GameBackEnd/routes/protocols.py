from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import SessionLocal
from db.models import Protocol

protocols_bp = Blueprint("protocols", __name__)


# ==========================
# GET ALL PROTOCOLS
# ==========================

@protocols_bp.get("")
@jwt_required()
def get_all_protocols():
    db = SessionLocal()

    protocols = db.query(Protocol).all()

    result = []
    for p in protocols:
        result.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "unlock_cost": p.unlock_cost
        })

    db.close()
    return jsonify(result)


# ==========================
# GET PROTOCOL BY ID
# ==========================

@protocols_bp.get("/<protocol_id>")
@jwt_required()
def get_protocol_by_id(protocol_id):
    db = SessionLocal()

    protocol = db.query(Protocol).filter_by(id=protocol_id).first()
    if not protocol:
        db.close()
        return jsonify({"error": "Protocol not found"}), 404

    result = {
        "id": protocol.id,
        "name": protocol.name,
        "description": protocol.description,
        "unlock_cost": protocol.unlock_cost
    }

    db.close()
    return jsonify(result)
