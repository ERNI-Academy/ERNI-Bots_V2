from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import SessionLocal
from db.models import ConstraintType, GameConstraint

constraints_bp = Blueprint("constraints", __name__)


# ==========================
# GET ALL CONSTRAINTS (grouped by type)
# ==========================

@constraints_bp.get("")
@jwt_required()
def get_all_constraints():
    db = SessionLocal()

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
            "id": ct.id,
            "name": ct.name,
            "constraints": [
                {
                    "id": c.id,
                    "text": c.text,
                    "price": c.price,
                }
                for c in items
            ],
        })

    db.close()
    return jsonify(result)
