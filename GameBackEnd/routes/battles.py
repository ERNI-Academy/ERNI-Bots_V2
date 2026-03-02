from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime

from utils import generate_uuid
from services.agent_service import get_agent_service, SessionExpiredError
from db import SessionLocal
from db.models import (
    Battle,
    BattleMessage,
    Fortress,
    Player,
    Season,
    PlayerSeasonStats,
    FortressSeasonStats,
    ActivityLog,
    PlayerHistoryEntry,
    Boss,
    PlayerBossStats,
)

agent_service = get_agent_service()
battles_bp = Blueprint("battles", __name__)


# ==========================
# Helpers
# ==========================

def get_active_season(db):
    season = db.query(Season).filter_by(is_active=True).first()
    return season


def _build_pvp_context(fortress):
    """Build the AgenticService context dict for a PvP fortress battle."""
    return {
        "protocol_template": fortress.protocol.protocol_template,
        "archetype_template": fortress.archetype.archetype_template,
        "story": fortress.story,
        "personality": fortress.personality.personality_template,
        "constraints": [c.text for c in fortress.constraints],
        "secret_word": fortress.protected_word,
    }


def _build_pve_context(boss):
    """Build the AgenticService context dict for a PvE boss battle."""
    return {
        "protocol_template": boss.prompt,
        "archetype_template": "",
        "personality": "",
        "constraints": "",
        "secret_word": boss.protected_word,
        "is_boss": True,
    }


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
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
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

        if fortress.owner and fortress.owner.is_banned:
            return jsonify({"error": "Esta fortaleza no está disponible", "code": "owner_banned"}), 403

        if fortress.owner_id == user_id:
            return jsonify({"error": "Cannot attack your own fortress"}), 403

        # Attacker must have their own fortress
        attacker_fortress = db.query(Fortress).filter_by(owner_id=user_id).first()
        if not attacker_fortress:
            return jsonify({"error": "You must create your own fortress before attacking"}), 403

        # Attacker's fortress must not be destroyed
        attacker_fortress_stats = get_or_create_fortress_season_stats(
            db, attacker_fortress.id, season.id
        )
        if attacker_fortress_stats.status == "destroyed":
            return jsonify({"error": "Tu fortaleza está destruida. Reconstruyela antes de atacar."}), 403

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
            # If the AI session expired in Redis, renew it transparently
            if not agent_service.session_exists(existing.session_id):
                new_session_id = agent_service.create_session(
                    agent_id=fortress.id,
                    context=_build_pvp_context(fortress)
                )
                existing.session_id = new_session_id
                db.commit()

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
                    "personality": fortress.personality.name,
                    "owner": fortress.owner.username,
                    "defeats": fortress_stats.defeat_count,
                    "attacks": fortress_stats.attack_count,
                },
                "history": history
            }
            return jsonify(response_data), 200

        # ── Create new battle ──────────────────────────────────────────────        # Block if attacker already won against this fortress after its last reconfiguration
        prev_win = db.query(Battle).filter_by(
            attacker_id=user_id,
            fortress_id=fortress_id,
            status="won"
        ).order_by(Battle.updated_at.desc()).first()

        if prev_win and prev_win.updated_at >= fortress.last_reconfigured_at:
            return jsonify({
                "error": "Ya has vencido esta fortaleza. Vuelve a atacarla cuando el propietario la reconfigure.",
                "code": "already_won"
            }), 403
        context = {
            "protocol_template": fortress.protocol.protocol_template,
            "archetype_template": fortress.archetype.archetype_template,
            "story": fortress.story,
            "personality": fortress.personality.personality_template,
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
                "personality": fortress.personality.name,
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
# START BOSS BATTLE (PvE)
# ==========================

@battles_bp.post("/boss")
@jwt_required()
def start_boss_battle():
    user_id = get_jwt_identity()
    data = request.json
    boss_id = data.get("boss_id")

    if not boss_id:
        return jsonify({"error": "Missing boss_id"}), 400

    db = SessionLocal()
    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        if season.is_frozen:
            return jsonify({"error": "Season is frozen"}), 403

        # Player must have an active fortress to attack bosses
        player = db.query(Player).filter_by(id=user_id).first()
        if not player or not player.fortress:
            return jsonify({"error": "You need an active fortress to attack bosses"}), 403

        boss = db.query(Boss).filter_by(id=boss_id, enabled=True).first()
        if not boss:
            return jsonify({"error": "Boss not found"}), 404

        # Check boss is unlocked
        if boss.active_at and boss.active_at > datetime.utcnow():
            return jsonify({"error": "Boss not yet available"}), 403

        # Check player hasn't already defeated this boss
        boss_stats = db.query(PlayerBossStats).filter_by(
            player_id=user_id, boss_id=boss_id
        ).first()
        if boss_stats and boss_stats.defeated:
            return jsonify({"error": "Boss already defeated"}), 400

        # Resume existing active battle
        existing = db.query(Battle).filter_by(
            attacker_id=user_id,
            boss_id=boss_id,
            status="active"
        ).first()

        if existing:
            # If the AI session expired in Redis, renew it transparently
            if not agent_service.session_exists(existing.session_id):
                new_session_id = agent_service.create_session(
                    agent_id=boss.id,
                    context=_build_pve_context(boss)
                )
                existing.session_id = new_session_id
                db.commit()

            history = [
                {
                    "role": m.role,
                    "text": m.text,
                    "timestamp": m.created_at.strftime("%H:%M:%S")
                }
                for m in existing.messages
            ]
            return jsonify({
                "battle_id": existing.id,
                "session_id": existing.session_id,
                "resumed": True,
                "turn_count": existing.turn_count,
                "max_turns": existing.max_turns,
                "boss": {
                    "id": boss.id,
                    "name": boss.name,
                    "title": boss.title,
                    "location": boss.location,
                    "story": boss.story,
                    "reward_score": boss.reward_score,
                    "reward_credits": boss.reward_credits,
                },
                "history": history
            }), 200

        # Create new boss battle
        context = {
            "protocol_template": boss.prompt,
            "archetype_template": "",
            "personality": "",
            "constraints": "",
            "secret_word": boss.protected_word,
            "is_boss": True,
        }

        session_id = agent_service.create_session(
            agent_id=boss.id,
            context=context
        )

        battle = Battle(
            id=generate_uuid(),
            attacker_id=user_id,
            boss_id=boss_id,
            fortress_id=None,
            session_id=session_id,
            status="active",
            type="pve",
            max_turns=10
        )

        db.add(battle)
        db.commit()
        db.refresh(battle)

        return jsonify({
            "battle_id": battle.id,
            "session_id": session_id,
            "resumed": False,
            "turn_count": 0,
            "max_turns": battle.max_turns,
            "boss": {
                "id": boss.id,
                "name": boss.name,
                "title": boss.title,
                "location": boss.location,
                "story": boss.story,
                "reward_score": boss.reward_score,
                "reward_credits": boss.reward_credits,
            },
            "history": []
        }), 201

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

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
            battle.updated_at = datetime.utcnow()

            # ── PvP: award fortress defender ──────────────────────────────
            if battle.fortress_id:
                defender = battle.fortress.owner
                attacker = db.query(Player).filter_by(id=user_id).first()

                log = ActivityLog(
                    type="battle_defense",
                    actor_id=defender.id,
                    target_id=attacker.id,
                    message=f"{defender.username} ha defendido con éxito su fortaleza contra {attacker.username}"
                )
                db.add(log)

                defender_season_stats = get_or_create_player_season_stats(
                    db, defender.id, season.id
                )
                defender_season_stats.score += 1
                defender.credits += 10

                db.add(PlayerHistoryEntry(
                    id=generate_uuid(),
                    player_id=defender.id,
                    type="points",
                    amount=1,
                    reason="battle_defense",
                    detail=f"Defensa exitosa contra {attacker.username} (turnos agotados)"
                ))
                db.add(PlayerHistoryEntry(
                    id=generate_uuid(),
                    player_id=defender.id,
                    type="fragments",
                    amount=10,
                    reason="battle_defense",
                    detail=f"Defensa exitosa contra {attacker.username} (turnos agotados)"
                ))

                fortress_stats = get_or_create_fortress_season_stats(
                    db, battle.fortress_id, season.id
                )
                fortress_stats.attack_count += 1
                fortress_stats.updated_at = datetime.utcnow()

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

        try:
            agent_reply = agent_service.send_message(battle.session_id, message)
        except SessionExpiredError:
            # The Redis session expired due to inactivity; recreate it and retry
            battle.updated_at = datetime.utcnow()
            if battle.fortress_id:
                new_session_id = agent_service.create_session(
                    agent_id=battle.fortress_id,
                    context=_build_pvp_context(battle.fortress)
                )
            else:
                new_session_id = agent_service.create_session(
                    agent_id=battle.boss_id,
                    context=_build_pve_context(battle.boss)
                )
            battle.session_id = new_session_id
            db.commit()
            agent_reply = agent_service.send_message(new_session_id, message)

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

        # ── Resolve protected word and target entity ──────────────────────
        is_pve = battle.type == "pve"

        if is_pve:
            boss = db.query(Boss).filter_by(id=battle.boss_id).first()
            if not boss:
                return jsonify({"error": "Boss not found"}), 404
            protected_word = boss.protected_word
        else:
            fortress = battle.fortress
            fortress_stats = get_or_create_fortress_season_stats(
                db, fortress.id, season.id
            )
            protected_word = fortress.protected_word

        # ── Correct guess ─────────────────────────────────────────────────
        if guess.upper() == protected_word.upper():
            battle.status = "won"
            battle.updated_at = datetime.utcnow()
            attacker = db.query(Player).filter_by(id=user_id).first()
            player_stats = get_or_create_player_season_stats(db, user_id, season.id)

            if is_pve:
                # Award attacker with boss reward (current values before reduction)
                score_awarded   = boss.reward_score
                credits_awarded = boss.reward_credits

                # Grant NFT asset if configured
                now = datetime.utcnow()
                purchase = PlayerAsset(
                    id=generate_uuid(),
                    player_id=user_id,
                    asset_type_id=reward_asset_type,
                    asset_id=reward_asset,
                    purchased_at=now,
                    purchase_price=0,
                )
                db.add(purchase)

                # Reduce boss rewards for future challengers (configurable floor and step)
                boss.reward_score   = max(boss.score_min,   boss.reward_score   - boss.score_reduction)
                boss.reward_credits = max(boss.credits_min, boss.reward_credits - boss.credits_reduction)

                player_stats.score += score_awarded
                attacker.credits   += credits_awarded

                db.add(PlayerHistoryEntry(
                    id=generate_uuid(),
                    player_id=attacker.id,
                    type="points",
                    amount=score_awarded,
                    reason="boss_defeated",
                    detail=f"Boss derrotado: {boss.name}"
                ))
                db.add(PlayerHistoryEntry(
                    id=generate_uuid(),
                    player_id=attacker.id,
                    type="fragments",
                    amount=credits_awarded,
                    reason="boss_defeated",
                    detail=f"Boss derrotado: {boss.name}"
                ))

                # Mark boss as defeated for this player
                boss_record = db.query(PlayerBossStats).filter_by(
                    player_id=user_id, boss_id=boss.id
                ).first()
                if boss_record:
                    boss_record.defeated = True
                else:
                    db.add(PlayerBossStats(
                        id=generate_uuid(),
                        player_id=user_id,
                        boss_id=boss.id,
                        defeated=True
                    ))

                db.commit()
                try:
                    agent_service.terminate_session(battle.session_id)
                except Exception:
                    pass

                return jsonify({
                    "result": "correct",
                    "score_awarded": score_awarded,
                    "credits_awarded": credits_awarded,
                    "invincible_bonus": False
                })

            else:
                # PvP win
                defender = fortress.owner
                log = ActivityLog(
                    type="battle_win",
                    actor_id=attacker.id,
                    target_id=defender.id,
                    message=f"{attacker.username} ha vencido a {defender.username}"
                )
                db.add(log)

                was_invincible = fortress_stats.defeat_count == 0
                score_awarded = 5 if was_invincible else 3
                credits_awarded = 50 if was_invincible else 30

                player_stats.score += score_awarded
                attacker.credits += credits_awarded

                db.add(PlayerHistoryEntry(
                    id=generate_uuid(),
                    player_id=attacker.id,
                    type="points",
                    amount=score_awarded,
                    reason="battle_win",
                    detail=f"Victoria contra {defender.username}{' (bonus invencible)' if was_invincible else ''}"
                ))
                db.add(PlayerHistoryEntry(
                    id=generate_uuid(),
                    player_id=attacker.id,
                    type="fragments",
                    amount=credits_awarded,
                    reason="battle_win",
                    detail=f"Victoria contra {defender.username}{' (bonus invencible)' if was_invincible else ''}"
                ))

                fortress_stats.defeat_count += 1
                fortress_stats.attack_count += 1
                fortress_stats.updated_at = datetime.utcnow()

                if fortress_stats.defeat_count >= 5:
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

        # ── Wrong guess ───────────────────────────────────────────────────
        battle.status = "lost"
        battle.updated_at = datetime.utcnow()

        if not is_pve:
            attacker = db.query(Player).filter_by(id=user_id).first()
            defender = fortress.owner

            log = ActivityLog(
                type="battle_defense",
                actor_id=defender.id,
                target_id=attacker.id,
                message=f"{defender.username} ha bloqueado el intento de {attacker.username}: palabra incorrecta"
            )
            db.add(log)

            defender_season_stats = get_or_create_player_season_stats(db, defender.id, season.id)
            defender_season_stats.score += 1
            defender.credits += 10

            db.add(PlayerHistoryEntry(
                id=generate_uuid(),
                player_id=defender.id,
                type="points",
                amount=1,
                reason="battle_defense",
                detail=f"Defensa exitosa contra {attacker.username} (palabra incorrecta)"
            ))
            db.add(PlayerHistoryEntry(
                id=generate_uuid(),
                player_id=defender.id,
                type="fragments",
                amount=10,
                reason="battle_defense",
                detail=f"Defensa exitosa contra {attacker.username} (palabra incorrecta)"
            ))

            fortress_stats.attack_count += 1
            fortress_stats.updated_at = datetime.utcnow()

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
