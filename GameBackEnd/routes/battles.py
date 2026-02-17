from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import generate_uuid, hash_word

battles_bp = Blueprint("battles", __name__)

@battles_bp.post("")
@jwt_required()
def start_battle():
    user_id = get_jwt_identity()
    data = request.json
    fortress_id = data.get("fortress_id")

    # TODODB: Retrieve fortress and validate
    # TODOAGENT: Create session in Agent Service
    session_id = "mock-session-id"

    battle_id = generate_uuid()

    # TODODB: Save battle

    return jsonify({
        "battle_id": battle_id,
        "session_id": session_id
    }), 201

@battles_bp.post("/<battle_id>/message")
@jwt_required()
def send_message(battle_id):
    data = request.json
    message = data.get("message")

    # TODODB: Validate battle ownership/status
    # TODOAGENT: Forward message to agent service
    agent_reply = "Mock response from agent"

    return jsonify({"response": agent_reply})

@battles_bp.post("/<battle_id>/guess")
@jwt_required()
def guess_word(battle_id):
    data = request.json
    guess = data.get("word")

    guess_hash = hash_word(guess)

    # TODODB: Retrieve protected_word_hash from DB
    protected_hash = hash_word("manzana")  # MOCK

    if guess_hash == protected_hash:
        # TODODB: Update battle and score
        return jsonify({"result": "correct", "score_awarded": 10})

    return jsonify({"result": "incorrect"}), 400