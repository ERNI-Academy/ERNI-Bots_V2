from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime
import random
import secrets
import string

from db import SessionLocal
from db.models import (
    Player,
    Fortress,
    Season,
    PlayerSeasonStats,
    FortressSeasonStats,
    Battle,
    Boss,
    PlayerBossStats,
    PlayerHistoryEntry,
    InvitationCode,
    AppConfig,
)

players_bp = Blueprint("players", __name__)


# ==========================
# Helpers
# ==========================

def get_active_season(db):
    return db.query(Season).filter_by(is_active=True).first()


def get_or_create_player_season_stats(db, player_id, season_id):
    stats = db.query(PlayerSeasonStats).filter_by(
        player_id=player_id,
        season_id=season_id
    ).first()

    if not stats:
        stats = PlayerSeasonStats(
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
# GET PROFILE
# ==========================

@players_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    db = SessionLocal()

    player = db.query(Player).filter_by(id=user_id).first()
    if not player:
        db.close()
        return jsonify({"error": "Player not found"}), 404

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    stats = get_or_create_player_season_stats(db, user_id, season.id)

    # Ranking dinámico
    higher_count = db.query(PlayerSeasonStats).filter(
        PlayerSeasonStats.season_id == season.id,
        PlayerSeasonStats.score > stats.score
    ).count()

    rank = higher_count + 1

    response = {
        "id": player.id,
        "username": player.username,
        "email": player.email,
        "credits": player.credits,
        "energy": player.energy,
        "season_score": stats.score,
        "rank": rank,
        "has_fortress": player.fortress is not None,
    }

    if player.fortress:
        fortress_stats = get_or_create_fortress_season_stats(db, player.fortress.id, season.id)
        response["fortress"] = {
            "id": player.fortress.id,
            "name": player.fortress.name,
            "defeat_count": fortress_stats.defeat_count,
            "attack_count": fortress_stats.attack_count,
            "status": fortress_stats.status,  # active | destroyed
        }

    db.close()
    return jsonify(response)
    
    
# ==========================
# GET HISTORY
# ==========================

@players_bp.get("/me/history")
@jwt_required()
def get_history():
    user_id = get_jwt_identity()

    type_filter = request.args.get("type")  # "points" | "fragments" | None (all)
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))

    db = SessionLocal()
    try:
        query = db.query(PlayerHistoryEntry).filter(
            PlayerHistoryEntry.player_id == user_id
        )

        if type_filter in ("points", "fragments"):
            query = query.filter(PlayerHistoryEntry.type == type_filter)

        total = query.count()

        entries = (
            query
            .order_by(PlayerHistoryEntry.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return jsonify({
            "total": total,
            "items": [
                {
                    "id": e.id,
                    "type": e.type,
                    "amount": e.amount,
                    "reason": e.reason,
                    "detail": e.detail,
                    "created_at": e.created_at.isoformat() + "Z"
                }
                for e in entries
            ]
        })
    finally:
        db.close()


# ==========================
# GET ACTIVE BOSSES
# ==========================

@players_bp.get("/get-active-bosses")
@jwt_required()
def get_active_bosses():
    user_id = get_jwt_identity()
    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    current_stats = get_or_create_player_season_stats(
        db, user_id, season.id
    )

    bosses = (
        db.query(Boss)
        .filter(Boss.enabled == True)
        .order_by(Boss.active_at.asc().nullsfirst())
        .all()
    )

    result = []

    for boss in bosses:

        boss_stats = db.query(PlayerBossStats).filter_by(
            player_id=user_id,
            boss_id=boss.id
        ).first()

        if boss_stats and boss_stats.defeated:
            continue

        result.append({
            "type": "boss",
            "boss_id": boss.id,
            "name": boss.name,
            "title": boss.title,
            "location": boss.location,
            "story": boss.story,
            "reward_credits": boss.reward_credits,
            "reward_score": boss.reward_score,
            "active_at": boss.active_at.isoformat() + "Z" if boss.active_at else None,
        })

    db.close()
    return jsonify(result)

# ==========================
# MATCHMAKING
# ==========================

@players_bp.get("/matchmaking")
@jwt_required()
def matchmaking():
    user_id = get_jwt_identity()
    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    if season.is_frozen or season.finalized:
        db.close()
        return jsonify([]), 200

    current_player = db.query(Player).filter_by(id=user_id).first()
    current_stats = get_or_create_player_season_stats(
        db, user_id, season.id
    )

    MIN_RESULTS = 6
    INITIAL_DELTA = 100

    # Fortalezas ya vencidas esta season Y que no han sido reconfiguradas desde la victoria
    defeated_fortress_ids = (
        db.query(Battle.fortress_id)
        .join(Fortress, Fortress.id == Battle.fortress_id)
        .filter(
            Battle.attacker_id == user_id,
            Battle.status == "won",
            Battle.updated_at >= Fortress.last_reconfigured_at
        )
        .all()
    )

    defeated_fortress_ids = [f[0] for f in defeated_fortress_ids]

    # Read app config: are bot fortresses enabled?
    cfg_bots = db.get(AppConfig, "bot_fortresses_enabled")
    bot_fortresses_enabled = cfg_bots is None or cfg_bots.value.lower() == "true"

    delta = INITIAL_DELTA
    results = []

    while len(results) < MIN_RESULTS:

        min_score = current_stats.score - delta
        max_score = current_stats.score + delta

        query = (
            db.query(Player, Fortress)
            .join(Fortress, Fortress.owner_id == Player.id)
            .join(PlayerSeasonStats,
                  PlayerSeasonStats.player_id == Player.id)
            .filter(Player.id != user_id)
            .filter(Player.is_banned == False)  # noqa: E712
            .filter(PlayerSeasonStats.season_id == season.id)
            .filter(PlayerSeasonStats.score.between(min_score, max_score))
            .filter(~Fortress.id.in_(defeated_fortress_ids))
        )

        if not bot_fortresses_enabled:
            query = query.filter(Player.is_bot == False)  # noqa: E712

        rows = query.all()

        # Filtrar dinámicamente por estado estacional
        filtered = []
        for player, fortress in rows:

            f_stats = get_or_create_fortress_season_stats(
                db, fortress.id, season.id
            )

            if f_stats.status == "destroyed":
                continue

            filtered.append((player, fortress, f_stats))

       # Orden con presión dinámica + randomización suave
        def ranking_key(x):
            player, fortress, f_stats = x

            score_distance = abs(
                player.season_stats[0].score - current_stats.score
            )

            pressure_component = (
                f_stats.defeat_count * 2
                - f_stats.attack_count
            )

            # Ruido pequeño controlado
            noise = random.uniform(0, 5)

            return score_distance + pressure_component + noise


        filtered.sort(key=ranking_key)

        results = filtered[:MIN_RESULTS]

        if len(results) >= MIN_RESULTS:
            break

        delta *= 2

        if delta > 10000:
            break

    response = []

    for player, fortress, f_stats in results:
        response.append({
            "username": player.username,
            "season_score": player.season_stats[0].score,
            "fortress_id": fortress.id,
            "fortress_name": fortress.name,
            "defeats": f_stats.defeat_count,
            "attacks": f_stats.attack_count,
            "fortress_description": fortress.story
        })

    db.close()
    return jsonify(response)


# ==========================
# Player Invitations
# ==========================

MAX_PLAYER_INVITATIONS = 10

def _gen_invite_code(length: int = 32) -> str:
    alphabet = string.ascii_uppercase + string.digits
    raw = "".join(secrets.choice(alphabet) for _ in range(length))
    return "-".join(raw[i:i + 8] for i in range(0, len(raw), 8))


@players_bp.get("/me/invitations")
@jwt_required()
def list_my_invitations():
    """List all invitation codes generated by the authenticated player."""
    player_id = get_jwt_identity()
    db = SessionLocal()
    try:
        invitations = (
            db.query(InvitationCode)
            .filter(InvitationCode.created_by == player_id)
            .order_by(InvitationCode.created_at.desc())
            .all()
        )

        result = []
        for inv in invitations:
            invited_user = None
            if inv.player_id:
                p = db.query(Player).filter_by(id=inv.player_id).first()
                invited_user = p.username if p else None

            result.append({
                "id":           inv.id,
                "code":         inv.code,
                "is_active":    inv.is_active,
                "claimed":      inv.player_id is not None,
                "invited_user": invited_user,
                "created_at":   inv.created_at.isoformat() if inv.created_at else None,
                "used_at":      inv.last_used_at.isoformat() if inv.last_used_at else None,
                "expires_at":   inv.expires_at.isoformat() if inv.expires_at else None,
            })

        return jsonify({
            "invitations": result,
            "total":       len(result),
            "remaining":   max(0, MAX_PLAYER_INVITATIONS - len(result)),
            "max":         MAX_PLAYER_INVITATIONS,
        })
    finally:
        db.close()


@players_bp.post("/me/invitations")
@jwt_required()
def create_my_invitation():
    """Generate a new invitation code (max MAX_PLAYER_INVITATIONS per player)."""
    player_id = get_jwt_identity()
    db = SessionLocal()
    try:
        # Check global feature flag for player-generated invitations
        cfg = db.get(AppConfig, "player_invitations_enabled")
        if cfg is not None and cfg.value.lower() != "true":
            return jsonify({"error": "La generación de invitaciones por jugadores está deshabilitada"}), 403

        existing_count = (
            db.query(func.count(InvitationCode.id))
            .filter(InvitationCode.created_by == player_id)
            .scalar()
        )
        if existing_count >= MAX_PLAYER_INVITATIONS:
            return jsonify({
                "error": f"Has alcanzado el límite de {MAX_PLAYER_INVITATIONS} invitaciones"
            }), 409

        plain = _gen_invite_code()
        inv = InvitationCode(
            code=plain,
            is_active=True,
            max_uses=1,
            current_uses=0,
            created_by=player_id,
            tag="invitation",
        )
        db.add(inv)
        db.commit()
        db.refresh(inv)

        return jsonify({
            "id":        inv.id,
            "code":      inv.code,
            "is_active": inv.is_active,
            "claimed":   False,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }), 201
    except Exception:
        db.rollback()
        return jsonify({"error": "Error al crear la invitación"}), 500
    finally:
        db.close()