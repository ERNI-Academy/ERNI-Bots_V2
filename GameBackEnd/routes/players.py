from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import random
import secrets
import string
import logging

logger = logging.getLogger(__name__)

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
from db import engine as db_engine
from utils import generate_uuid

players_bp = Blueprint("players", __name__)


# ==========================
# Helpers
# ==========================

def get_active_season(db):
    return db.query(Season).filter_by(is_active=True).first()


def get_or_create_player_season_stats(db, player_id, season_id):
    """Atomically ensure a PlayerSeasonStats row exists and return it."""
    is_postgres = db_engine.dialect.name == "postgresql"
    new_id = generate_uuid()
    if is_postgres:
        sql = text("""
            INSERT INTO player_season_stats (id, player_id, season_id, score)
            VALUES (:id, :player_id, :season_id, 0)
            ON CONFLICT (player_id, season_id) DO NOTHING
        """)
    else:
        sql = text("""
            INSERT OR IGNORE INTO player_season_stats (id, player_id, season_id, score)
            VALUES (:id, :player_id, :season_id, 0)
        """)
    try:
        db.execute(sql, {"id": new_id, "player_id": player_id, "season_id": season_id})
    except Exception as exc:
        logger.exception("[get_or_create_player_season_stats] INSERT failed for player=%s season=%s: %s", player_id, season_id, exc)
        db.rollback()
    stats = db.query(PlayerSeasonStats).filter_by(
        player_id=player_id, season_id=season_id
    ).first()
    if stats is None:
        logger.error("[get_or_create_player_season_stats] Record still missing after INSERT for player=%s season=%s", player_id, season_id)
    return stats


def get_or_create_fortress_season_stats(db, fortress_id, season_id):
    """Atomically ensure a FortressSeasonStats row exists and return it."""
    is_postgres = db_engine.dialect.name == "postgresql"
    new_id = generate_uuid()
    if is_postgres:
        sql = text("""
            INSERT INTO fortress_season_stats (id, fortress_id, season_id, defeat_count, attack_count, status, created_at, updated_at)
            VALUES (:id, :fortress_id, :season_id, 0, 0, 'active', NOW(), NOW())
            ON CONFLICT (fortress_id, season_id) DO NOTHING
        """)
    else:
        sql = text("""
            INSERT OR IGNORE INTO fortress_season_stats (id, fortress_id, season_id, defeat_count, attack_count, status, created_at, updated_at)
            VALUES (:id, :fortress_id, :season_id, 0, 0, 'active', :now, :now)
        """)
    try:
        db.execute(sql, {"id": new_id, "fortress_id": fortress_id, "season_id": season_id, "now": datetime.utcnow().isoformat()})
    except Exception as exc:
        logger.exception("[get_or_create_fortress_season_stats] INSERT failed for fortress=%s season=%s: %s", fortress_id, season_id, exc)
        db.rollback()
    stats = db.query(FortressSeasonStats).filter_by(
        fortress_id=fortress_id, season_id=season_id
    ).first()
    if stats is None:
        logger.error("[get_or_create_fortress_season_stats] Record still missing after INSERT for fortress=%s season=%s", fortress_id, season_id)
    return stats


# ==========================
# GET PROFILE
# ==========================

@players_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    db = SessionLocal()

    try:
        player = db.query(Player).filter_by(id=user_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        print(f"[get_profile] Player {player.username} (ID: {player.id}) is fetching profile for season '{season.name}' (ID: {season.id})")
        stats = get_or_create_player_season_stats(db, user_id, season.id)
        db.commit()  # persist newly created stats if any

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
            db.commit()  # persist newly created fortress stats if any
            response["fortress"] = {
                "id": player.fortress.id,
                "name": player.fortress.name,
                "defeat_count": fortress_stats.defeat_count,
                "attack_count": fortress_stats.attack_count,
                "status": fortress_stats.status,  # active | destroyed
            }

        return jsonify(response)
    except Exception as exc:
        logger.exception("[get_profile] Unhandled error for user=%s: %s", user_id, exc)
        db.rollback()
        raise
    finally:
        db.close()
    
    
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

    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        get_or_create_player_season_stats(db, user_id, season.id)
        db.commit()  # persist newly created stats if any

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

            defeated = bool(boss_stats and boss_stats.defeated)

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
                "defeated": defeated,
            })

        return jsonify(result)
    except Exception as exc:
        logger.exception("[get_active_bosses] Unhandled error for user=%s: %s", user_id, exc)
        db.rollback()
        raise
    finally:
        db.close()

# ==========================
# MATCHMAKING
# ==========================

@players_bp.get("/matchmaking")
@jwt_required()
def matchmaking():
    user_id = get_jwt_identity()
    db = SessionLocal()

    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        if season.is_frozen or season.finalized:
            return jsonify([]), 200

        current_player = db.query(Player).filter_by(id=user_id).first()
        current_stats = get_or_create_player_season_stats(
            db, user_id, season.id
        )
        db.commit()  # persist newly created stats if any

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

        def _build_base_query(min_score, max_score):
            return (
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

        def _filter_and_rank(rows):
            filtered = []
            for player, fortress in rows:
                f_stats = get_or_create_fortress_season_stats(
                    db, fortress.id, season.id
                )
                if f_stats.status == "destroyed":
                    continue
                filtered.append((player, fortress, f_stats))

            def ranking_key(x):
                player, fortress, f_stats = x
                score_distance = abs(
                    player.season_stats[0].score - current_stats.score
                )
                pressure_component = (
                    f_stats.defeat_count * 2
                    - f_stats.attack_count
                )
                noise = random.uniform(0, 5)
                return score_distance + pressure_component + noise

            filtered.sort(key=ranking_key)
            return filtered

        # ── Phase 1: real players only ──
        real_results = []
        while len(real_results) < MIN_RESULTS:
            min_score = current_stats.score - delta
            max_score = current_stats.score + delta

            q = _build_base_query(min_score, max_score)
            q = q.filter(Player.is_bot == False)  # noqa: E712
            real_results = _filter_and_rank(q.all())[:MIN_RESULTS]

            if len(real_results) >= MIN_RESULTS:
                break
            delta *= 2
            if delta > 2000:
                break

        # ── Phase 2: fill with bots if needed and enabled ──
        bot_results = []
        if len(real_results) < MIN_RESULTS and bot_fortresses_enabled:
            bot_delta = INITIAL_DELTA
            while len(real_results) + len(bot_results) < MIN_RESULTS:
                min_score = current_stats.score - bot_delta
                max_score = current_stats.score + bot_delta

                q = _build_base_query(min_score, max_score)
                q = q.filter(Player.is_bot == True)  # noqa: E712
                bot_results = _filter_and_rank(q.all())[: MIN_RESULTS - len(real_results)]

                if len(real_results) + len(bot_results) >= MIN_RESULTS:
                    break
                bot_delta *= 2
                if bot_delta > 10000:
                    break

        results = real_results + bot_results

        db.commit()  # persist any fortress season stats created during matchmaking

        response = []

        for player, fortress, f_stats in results:
            response.append({
                "username": player.username,
                "season_score": player.season_stats[0].score,
                "fortress_id": fortress.id,
                "fortress_name": fortress.name,
                "defeats": f_stats.defeat_count,
                "attacks": f_stats.attack_count,
                "fortress_description": fortress.story,
                "is_bot": player.is_bot,
            })

        return jsonify(response)
    except Exception as exc:
        logger.exception("[matchmaking] Unhandled error for user=%s: %s", user_id, exc)
        db.rollback()
        raise
    finally:
        db.close()


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
        player = db.query(Player).filter_by(id=player_id).first()
        is_admin = player.is_admin if player else False

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
            "remaining":   None if is_admin else max(0, MAX_PLAYER_INVITATIONS - len(result)),
            "max":         None if is_admin else MAX_PLAYER_INVITATIONS,
            "unlimited":   is_admin,
        })
    finally:
        db.close()


@players_bp.post("/me/invitations")
@jwt_required()
def create_my_invitation():
    """Generate a new invitation code (max MAX_PLAYER_INVITATIONS per player; unlimited for admins)."""
    player_id = get_jwt_identity()
    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        is_admin = player.is_admin if player else False

        # Check global feature flag for player-generated invitations
        cfg = db.get(AppConfig, "player_invitations_enabled")
        if cfg is not None and cfg.value.lower() != "true":
            return jsonify({"error": "La generación de invitaciones por jugadores está deshabilitada"}), 403

        if not is_admin:
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
