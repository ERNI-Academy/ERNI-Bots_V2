from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime

from utils import generate_uuid
from services.agent_service import get_agent_service
from db import SessionLocal
from db.models import (
    Battle,
    BattleMessage,
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
        db.flush()

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
        db.flush()

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
    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        if season.is_frozen:
            return jsonify({"error": "Season is frozen"}), 403

        fortress = db.query(Fortress).filter_by(id=fortress_id).first()
        if not fortress:
            return jsonify({"error": "Fortress not found"}), 404

        if fortress.owner_id == user_id:
            return jsonify({"error": "Cannot attack your own fortress"}), 403

        fortress_stats = get_or_create_fortress_season_stats(
            db, fortress.id, season.id
        )

        if fortress_stats.status == "destroyed":
            return jsonify({"error": "Fortress destroyed this season"}), 403

        # ── Resume existing active battle ──────────────────────────────────
        existing = db.query(Battle).filter_by(
            attacker_id=user_id,
            fortress_id=fortress_id,
            status="active"
        ).first()

        if existing:
            history = [
                {
                    "role": m.role,
                    "text": m.text,
                    "timestamp": m.created_at.strftime("%H:%M:%S")
                }
                for m in existing.messages
            ]
            response_data = {
                "battle_id": existing.id,
                "session_id": existing.session_id,
                "resumed": True,
                "turn_count": existing.turn_count,
                "max_turns": existing.max_turns,
                "fortress": {
                    "id": fortress.id,
                    "name": fortress.name,
                    "story": fortress.story,
                    "personality": fortress.personality,
                    "owner": fortress.owner.username,
                    "defeats": fortress_stats.defeat_count,
                    "attacks": fortress_stats.attack_count,
                },
                "history": history
            }
            return jsonify(response_data), 200

        # ── Create new battle ──────────────────────────────────────────────
        fortress_stats.attack_count += 1

        context = {
            "protocol_template": fortress.protocol.protocol_template,
            "archetype_template": fortress.archetype.archetype_template,
            "story": fortress.story,
            "personality": fortress.personality,
            "constraints": [c.text for c in fortress.constraints],
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
            type="pvp",
            max_turns=10
        )

        db.add(battle)
        db.commit()
        db.refresh(battle)

        response_data = {
            "battle_id": battle.id,
            "session_id": session_id,
            "resumed": False,
            "turn_count": 0,
            "max_turns": battle.max_turns,
            "fortress": {
                "id": fortress.id,
                "name": fortress.name,
                "story": fortress.story,
                "personality": fortress.personality,
                "owner": fortress.owner.username,
                "defeats": fortress_stats.defeat_count,
                "attacks": fortress_stats.attack_count,
            },
            "history": []
        }

        return jsonify(response_data), 201

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


# ==========================
# MESSAGE LOOP
# ==========================

@battles_bp.post("/<battle_id>/message")
@jwt_required()
def send_message(battle_id):
    user_id = get_jwt_identity()
    data = request.json
    message = data.get("message")

    if not message:
        return jsonify({"error": "Missing message"}), 400

    db = SessionLocal()
    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "Season not existent"}), 403
        if season.is_frozen:
            return jsonify({"error": "Season is frozen"}), 403

        battle = db.query(Battle).filter_by(id=battle_id).first()
        if not battle:
            return jsonify({"error": "Battle not found"}), 404

        if battle.attacker_id != user_id:
            return jsonify({"error": "Not authorized"}), 403

        if battle.status != "active":
            return jsonify({"error": "Battle not active"}), 400

        battle.turn_count += 1

        # Persist user message
        user_msg = BattleMessage(
            id=generate_uuid(),
            battle_id=battle.id,
            role="user",
            text=message
        )
        db.add(user_msg)

        if battle.turn_count > battle.max_turns:
            battle.status = "lost"

            defender = battle.fortress.owner
            attacker = db.query(Player).filter_by(id=user_id).first()

            log = ActivityLog(
                type="battle_defense",
                actor_id=defender.id,
                target_id=attacker.id,
                message=f"{defender.username} ha defendido con éxito su fortaleza contra {attacker.username}"
            )
            db.add(log)

            # Award defender: 1 point + 10 credits
            defender_season_stats = get_or_create_player_season_stats(
                db, defender.id, season.id
            )
            defender_season_stats.score += 1
            defender.credits += 10

            # Increment fortress attack counter
            fortress_stats = get_or_create_fortress_season_stats(
                db, battle.fortress_id, season.id
            )
            fortress_stats.attack_count += 1

            db.commit()
            try:
                agent_service.terminate_session(battle.session_id)
            except Exception:
                pass

            return jsonify({
                "result": "defense",
                "message": "La fortaleza ha resistido el ataque.",
                "turns_used": battle.turn_count
            })

        agent_reply = agent_service.send_message(battle.session_id, message)

        # Persist guardian reply
        guardian_msg = BattleMessage(
            id=generate_uuid(),
            battle_id=battle.id,
            role="guardian",
            text=agent_reply
        )
        db.add(guardian_msg)
        db.commit()

        return jsonify({"response": agent_reply})

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


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
    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        if season.is_frozen:
            return jsonify({"error": "Season is frozen"}), 403

        battle = db.query(Battle).filter_by(id=battle_id).first()
        if not battle:
            return jsonify({"error": "Battle not found"}), 404

        if battle.attacker_id != user_id:
            return jsonify({"error": "Not authorized"}), 403

        if battle.status != "active":
            return jsonify({"error": "Battle already finished"}), 400

        fortress = battle.fortress
        fortress_stats = get_or_create_fortress_season_stats(
            db, fortress.id, season.id
        )

        if guess.upper() == fortress.protected_word.upper():
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

            player_stats = get_or_create_player_season_stats(
                db, user_id, season.id
            )

            # Determine bonus before incrementing defeat count
            was_invincible = fortress_stats.defeat_count == 0
            score_awarded = 5 if was_invincible else 3
            credits_awarded = 50 if was_invincible else 30

            player_stats.score += score_awarded
            attacker.credits += credits_awarded

            fortress_stats.defeat_count += 1

            if fortress_stats.defeat_count >= 3:
                fortress_stats.status = "reconfigurable"

            if fortress_stats.defeat_count > 4:
                fortress_stats.status = "destroyed"

            db.commit()
            try:
                agent_service.terminate_session(battle.session_id)
            except Exception:
                pass

            return jsonify({
                "result": "correct",
                "score_awarded": score_awarded,
                "credits_awarded": credits_awarded,
                "invincible_bonus": was_invincible
            })

        # Wrong guess — counts as successful defense
        battle.status = "lost"
        attacker = db.query(Player).filter_by(id=user_id).first()
        defender = fortress.owner

        log = ActivityLog(
            type="battle_defense",
            actor_id=defender.id,
            target_id=attacker.id,
            message=f"{defender.username} ha bloqueado el intento de {attacker.username}: palabra incorrecta"
        )
        db.add(log)

        # Award defender: 1 point + 10 credits
        defender_season_stats = get_or_create_player_season_stats(
            db, defender.id, season.id
        )
        defender_season_stats.score += 1
        defender.credits += 10

        # Increment fortress attack counter
        fortress_stats.attack_count += 1

        db.commit()
        try:
            agent_service.terminate_session(battle.session_id)
        except Exception:
            pass

        return jsonify({"result": "defense", "reason": "wrong_guess"})

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
