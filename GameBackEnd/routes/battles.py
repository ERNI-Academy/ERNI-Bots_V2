from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime

from utils import generate_uuid
from services.agent_service import get_agent_service
from db import SessionLocal
from db.models import (
    Battle,
    Fortress,
    Player,
    Season,
    PlayerSeasonStats,
    FortressSeasonStats,
    ActivityLog
)

agent_service = get_agent_service()
battles_bp = Blueprint("battles", __name__)


# ==========================
# Helpers
# ==========================

def get_active_season(db):
    season = db.query(Season).filter_by(is_active=True).first()
    return season


def get_or_create_player_season_stats(db, player_id, season_id):
    stats = db.query(PlayerSeasonStats).filter_by(
        player_id=player_id,
        season_id=season_id
    ).first()

    if not stats:
        stats = PlayerSeasonStats(
            id=generate_uuid(),
            player_id=player_id,
            season_id=season_id,
            score=0
        )
        db.add(stats)
        db.commit()

    return stats


def get_or_create_fortress_season_stats(db, fortress_id, season_id):
    stats = db.query(FortressSeasonStats).filter_by(
        fortress_id=fortress_id,
        season_id=season_id
    ).first()

    if not stats:
        stats = FortressSeasonStats(
            id=generate_uuid(),
            fortress_id=fortress_id,
            season_id=season_id,
            defeat_count=0,
            attack_count=0,
            status="active"
        )
        db.add(stats)
        db.commit()

    return stats


# ==========================
# START BATTLE
# ==========================

@battles_bp.post("")
@jwt_required()
def start_battle():
    user_id = get_jwt_identity()
    data = request.json
    fortress_id = data.get("fortress_id")

    if not fortress_id:
        return jsonify({"error": "Missing fortress_id"}), 400

    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    if season.is_frozen:
        db.close()
        return jsonify({"error": "Season is frozen"}), 403

    fortress = db.query(Fortress).filter_by(id=fortress_id).first()
    if not fortress:
        db.close()
        return jsonify({"error": "Fortress not found"}), 404

    if fortress.owner_id == user_id:
        db.close()
        return jsonify({"error": "Cannot attack your own fortress"}), 403

    fortress_stats = get_or_create_fortress_season_stats(
        db, fortress.id, season.id
    )

    if fortress_stats.status == "destroyed":
        db.close()
        return jsonify({"error": "Fortress destroyed this season"}), 403

    # COSTE DINÁMICO POR DERROTAS
    base_cost = 10
    extra_cost_per_defeat = 5
    attack_cost = base_cost + (fortress_stats.defeat_count * extra_cost_per_defeat)

    attacker = db.query(Player).filter_by(id=user_id).first()
    if attacker.credits < attack_cost:
        db.close()
        return jsonify({"error": "Not enough credits"}), 403

    attacker.credits -= attack_cost

    fortress_stats.attack_count += 1

    context = {
        "protocol_template": fortress.protocol.protocol_template,
        "archetype_template": fortress.archetype.archetype_template,
        "story": fortress.story,
        "personality": fortress.personality,
        "constraints": fortress.constraints,
        "secret_word": fortress.protected_word
    }

    session_id = agent_service.create_session(
        agent_id=fortress.id,
        context=context
    )

    battle = Battle(
        id=generate_uuid(),
        attacker_id=user_id,
        fortress_id=fortress_id,
        session_id=session_id,
        status="active",
        type="pvp"
    )

    db.add(battle)
    db.commit()
    db.refresh(battle)
    db.close()

    return jsonify({
        "battle_id": battle.id,
        "session_id": session_id,
        "attack_cost": attack_cost
    }), 201


# ==========================
# MESSAGE LOOP
# ==========================

@battles_bp.post("/<battle_id>/message")
@jwt_required()
def send_message(battle_id):
    user_id = get_jwt_identity()
    data = request.json
    message = data.get("message")
    db = SessionLocal()
    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "Season not existent"}), 403
    if season.is_frozen:
        db.close()
        return jsonify({"error": "Season is frozen"}), 403
    if not message:
        return jsonify({"error": "Missing message"}), 400

    

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
    battle.turn_count += 1

    if battle.turn_count > battle.max_turns:
        battle.status = "lost"

        defender = battle.fortress.owner
        attacker = db.query(Player).filter_by(id=user_id).first()

        log = ActivityLog(
            type="battle_defense",
            actor_id=defender.id,
            target_id=attacker.id,
            message=f"{defender.username} ha defendido con éxito su fortaleza"
        )

        db.add(log)

        agent_service.terminate_session(battle.session_id)

        db.commit()
        db.close()

        return jsonify({
            "result": "defense",
            "message": "La fortaleza ha resistido el ataque."
        })
        # log defensa exitosa
    agent_reply = agent_service.send_message(
        battle.session_id,
        message
    )

    db.commit()
    db.close()

    return jsonify({"response": agent_reply})


# ==========================
# GUESS WORD
# ==========================

@battles_bp.post("/<battle_id>/guess")
@jwt_required()
def guess_word(battle_id):
    user_id = get_jwt_identity()
    data = request.json
    guess = data.get("word")

    if not guess:
        return jsonify({"error": "Missing word"}), 400

    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    if season.is_frozen:
        db.close()
        return jsonify({"error": "Season is frozen"}), 403

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

    fortress = battle.fortress
    fortress_stats = get_or_create_fortress_season_stats(
        db, fortress.id, season.id
    )

    if guess == fortress.protected_word:

        battle.status = "won"
        attacker = db.query(Player).filter_by(id=user_id).first()
        defender = fortress.owner

        log = ActivityLog(
            type="battle_win",
            actor_id=attacker.id,
            target_id=defender.id,
            message=f"{attacker.username} ha vencido a {defender.username}"
        )

        db.add(log)
        # SCORE ESTACIONAL
        player_stats = get_or_create_player_season_stats(
            db, user_id, season.id
        )
        player_stats.score += 10

        # DERROTAS
        fortress_stats.defeat_count += 1

        if fortress_stats.defeat_count == 3:
            fortress_stats.status = "reconfigurable"

        if fortress_stats.defeat_count >= 4:
            fortress_stats.status = "destroyed"

        agent_service.terminate_session(battle.session_id)

        db.commit()
        db.close()

        return jsonify({
            "result": "correct",
            "score_awarded": 10
        })

    db.close()
    return jsonify({"result": "incorrect"}), 400
