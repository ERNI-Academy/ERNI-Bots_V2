from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import generate_uuid, hash_word
from services.agent_service import get_agent_service
from db import SessionLocal
from db.models import Battle, Fortress, Player
agent_service = get_agent_service()
battles_bp = Blueprint("battles", __name__)


@battles_bp.post("")
@jwt_required()
def start_battle():
    user_id = get_jwt_identity()
    data = request.json
    fortress_id = data.get("fortress_id")

    if not fortress_id:
        return jsonify({"error": "Missing fortress_id"}), 400

    db = SessionLocal()

    fortress = db.query(Fortress).filter_by(id=fortress_id).first()

    if not fortress:
        db.close()
        return jsonify({"error": "Fortress not found"}), 404

    if fortress.owner_id == user_id:
        db.close()
        return jsonify({"error": "Cannot attack your own fortress"}), 403
    context = {
        "fortress_prompt": fortress.prompt,
        "protocol": fortress.protocol,
        "archetype": fortress.archetype,
        "personality": fortress.personality,
        "restrictions": fortress.restrictions,
        "secret_word": fortress.secret_word
    }

    

    # TODOAGENT:
    # Call Agent Service to create a combat session for this fortress.
    # Expected:
    # POST /agents/{agent_id}/sessions
    # session_id = response["session_id"]
    session_id = agent_service.create_session(
        agent_id=fortress.id,
        context=context
    )

    battle = Battle(
        id=generate_uuid(),
        attacker_id=user_id,
        fortress_id=fortress_id,
        session_id=session_id,
        status="active"
    )

    db.add(battle)
    db.commit()
    db.refresh(battle)
    db.close()

    return jsonify({
        "battle_id": battle.id,
        "session_id": session_id
    }), 201


@battles_bp.post("/<battle_id>/message")
@jwt_required()
def send_message(battle_id):
    user_id = get_jwt_identity()
    data = request.json
    message = data.get("message")

    if not message:
        return jsonify({"error": "Missing message"}), 400

    db = SessionLocal()

    battle = db.query(Battle).filter_by(id=battle_id).first()

    if not battle:
        db.close()
        return jsonify({"error": "Battle not found"}), 404

    if battle.attacker_id != user_id:
        db.close()
        return jsonify({"error": "Not authorized"}), 403

    if battle.status != "active":
        db.close()
        return jsonify({"error": "Battle not active"}), 400

    # TODOAGENT:
    # Forward message to Agent Service:
    # POST /sessions/{battle.session_id}/message
    # payload = {"message": message}
    # agent_reply = response["response"]

    agent_reply = agent_service.send_message(
        battle.session_id,
        user_message
    )

    db.close()

    return jsonify({
        "response": agent_reply
    })


@battles_bp.post("/<battle_id>/guess")
@jwt_required()
def guess_word(battle_id):
    user_id = get_jwt_identity()
    data = request.json
    guess = data.get("word")

    if not guess:
        return jsonify({"error": "Missing word"}), 400

    guess_hash = hash_word(guess)

    db = SessionLocal()

    battle = db.query(Battle).filter_by(id=battle_id).first()

    if not battle:
        db.close()
        return jsonify({"error": "Battle not found"}), 404

    if battle.attacker_id != user_id:
        db.close()
        return jsonify({"error": "Not authorized"}), 403

    if battle.status != "active":
        db.close()
        return jsonify({"error": "Battle already finished"}), 400

    protected_hash = battle.fortress.protected_word_hash

    if guess_hash == protected_hash:

        battle.status = "won"

        attacker = db.query(Player).filter_by(id=user_id).first()
        attacker.score += 10

        # TODOAGENT:
        # Optional: Notify Agent Service that session is terminated.
        # POST /sessions/{battle.session_id}/terminate
        agent_service.terminate_session(battle.session_id)
        
        db.commit()
        db.close()

        return jsonify({
            "result": "correct",
            "score_awarded": 10
        })

    db.close()
    return jsonify({"result": "incorrect"}), 400
