from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import SessionLocal
from db.models import PlayerWord

words_bp = Blueprint("words", __name__)


# ==========================
# GET PLAYER'S ASSIGNED WORDS
# ==========================

@words_bp.get("")
@jwt_required()
def get_my_words():
    user_id = get_jwt_identity()
    db = SessionLocal()
    rows = (
        db.query(PlayerWord)
        .filter_by(player_id=user_id)
        .all()
    )
    result = [
        {"id": r.word.id, "word": r.word.word}
        for r in rows
    ]
    result.sort(key=lambda x: x["word"])
    db.close()
    return jsonify(result)
