from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

players_bp = Blueprint("players", __name__)

@players_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()

    # TODODB: Fetch player info
    player = {
        "id": user_id,
        "username": "demo",
        "score": 100,
        "energy": 50
    }

    return jsonify(player)