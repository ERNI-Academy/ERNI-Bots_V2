from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import SessionLocal
from db.models import Personality

personalities_bp = Blueprint("personalities", __name__)


# ==========================
# GET ALL PERSONALITIES
# ==========================

@personalities_bp.get("")
@jwt_required()
def get_all_personalities():
    db = SessionLocal()

    personalities = db.query(Personality).order_by(Personality.name).all()

    result = [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
        }
        for p in personalities
    ]

    db.close()
    return jsonify(result)


# ==========================
# GET PERSONALITY BY ID
# ==========================

@personalities_bp.get("/<personality_id>")
@jwt_required()
def get_personality_by_id(personality_id):
    db = SessionLocal()

    p = db.query(Personality).filter_by(id=personality_id).first()
    if not p:
        db.close()
        return jsonify({"error": "Personality not found"}), 404

    result = {
        "id": p.id,
        "name": p.name,
        "description": p.description,
    }

    db.close()
    return jsonify(result)
