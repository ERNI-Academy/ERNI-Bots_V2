from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import SessionLocal
from db.models import Player, Fortress

players_bp = Blueprint("players", __name__)


# ==========================
# GET /players/me
# ==========================

@players_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()

    db = SessionLocal()

    player = db.query(Player).filter_by(id=user_id).first()

    if not player:
        db.close()
        return jsonify({"error": "Player not found"}), 404

    # Calcular ranking dinámicamente
    higher_rank_count = (
        db.query(Player)
        .filter(Player.score > player.score)
        .count()
    )

    rank = higher_rank_count + 1

    response = {
        "id": player.id,
        "username": player.username,
        "email": player.email,
        "score": player.score,
        "energy": player.energy,
        "rank": rank
    }

    db.close()

    return jsonify(response)


# ==========================
# GET /players/with-fortress
# ==========================

@players_bp.get("/with-fortress")
@jwt_required()
def players_with_fortress():

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))

    offset = (page - 1) * page_size

    db = SessionLocal()

    query = (
        db.query(Player, Fortress)
        .join(Fortress, Fortress.owner_id == Player.id)
        .order_by(Player.score.desc())
    )

    total = query.count()

    rows = (
        query
        .offset(offset)
        .limit(page_size)
        .all()
    )

    result = []

    for player, fortress in rows:
        result.append({
            "player_id": player.id,
            "username": player.username,
            "score": player.score,
            "fortress_id": fortress.id,
            "fortress_name": fortress.name
        })

    db.close()

    return jsonify({
        "page": page,
        "page_size": page_size,
        "total": total,
        "players": result
    })
