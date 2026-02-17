from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import hash_word, generate_uuid

from db import SessionLocal
from db.models import Fortress, Player

fortresses_bp = Blueprint("fortresses", __name__)


@fortresses_bp.post("")
@jwt_required()
def create_fortress():
    user_id = get_jwt_identity()
    data = request.json

    name = data.get("name")
    system_prompt = data.get("system_prompt")
    protected_word = data.get("protected_word")

    if not name or not system_prompt or not protected_word:
        return jsonify({"error": "Missing required fields"}), 400

    if " " in protected_word.strip():
        return jsonify({"error": "Protected word must be a single word"}), 400

    protected_hash = hash_word(protected_word)

    db = SessionLocal()

    player = db.query(Player).filter_by(id=user_id).first()

    if not player:
        db.close()
        return jsonify({"error": "Player not found"}), 404

    # TODOAGENT:
    # Call Agent Service to create a new agent with:
    # {
    #   "system_prompt": system_prompt,
    #   "protected_word": protected_word
    # }
    # Expected response:
    # agent_id = response["agent_id"]

    agent_id = "mock-agent-id"

    fortress = Fortress(
        id=generate_uuid(),
        owner_id=user_id,
        agent_id=agent_id,
        protected_word_hash=protected_hash,
        name=name
    )

    db.add(fortress)
    db.commit()
    db.refresh(fortress)
    db.close()

    return jsonify({"fortress_id": fortress.id}), 201


@fortresses_bp.get("")
@jwt_required()
def list_fortresses():
    user_id = get_jwt_identity()

    db = SessionLocal()

    fortresses = db.query(Fortress).all()

    result = []

    for fortress in fortresses:
        result.append({
            "id": fortress.id,
            "name": fortress.name,
            "owner": fortress.owner.username
        })

    db.close()

    return jsonify(result)
