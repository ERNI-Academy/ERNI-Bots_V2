from flask import Blueprint, jsonify
from db import SessionLocal
from db.models import Player

leaderboard_bp = Blueprint("leaderboard", __name__)


@leaderboard_bp.get("")
def leaderboard():

    db = SessionLocal()

    players = (
        db.query(Player)
        .order_by(Player.score.desc())
        .limit(500)
        .all()
    )

    result = []
    rank = 1

    for player in players:
        result.append({
            "rank": rank,
            "username": player.username,
            "score": player.score
        })
        rank += 1

    db.close()

    return jsonify(result)
