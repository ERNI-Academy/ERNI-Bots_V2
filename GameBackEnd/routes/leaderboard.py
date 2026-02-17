from flask import Blueprint, jsonify

leaderboard_bp = Blueprint("leaderboard", __name__)

@leaderboard_bp.get("")
def leaderboard():
    # TODODB: Fetch ranking from DB
    return jsonify([
        {"rank": 1, "username": "alice", "score": 980},
        {"rank": 2, "username": "bob", "score": 870}
    ])