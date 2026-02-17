from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import hash_word, generate_uuid

fortresses_bp = Blueprint("fortresses", __name__)

@fortresses_bp.post("")
@jwt_required()
def create_fortress():
    user_id = get_jwt_identity()
    data = request.json

    name = data.get("name")
    system_prompt = data.get("system_prompt")
    protected_word = data.get("protected_word")

    protected_hash = hash_word(protected_word)

    # TODOAGENT: Call Agent Service to create agent
    agent_id = "mock-agent-id"

    fortress_id = generate_uuid()

    # TODODB: Save fortress with agent_id and protected_hash

    return jsonify({"fortress_id": fortress_id}), 201

@fortresses_bp.get("")
@jwt_required()
def list_fortresses():
    # TODODB: Fetch public fortresses
    return jsonify([
        {"id": "uuid-1", "name": "Sir Bloqueo", "owner": "alice"}
    ])