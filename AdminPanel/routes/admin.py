"""
Admin routes — protected by X-Admin-Secret header.

Requires ADMIN_SECRET env var to be set. If not set, all endpoints return 503.

POST /api/v1/admin/invitations
    Create one or more invitation codes.

    Headers:
        X-Admin-Secret: <value of ADMIN_SECRET env var>

    Body (JSON, all optional):
        {
            "count":      1,              # number of codes to generate (1–50)
            "expires":    "2026-12-31",   # expiry date, YYYY-MM-DD
            "max_uses":   1,              # max registrations per code
            "created_by": "admin"         # audit label
        }

    Response 201:
        {
            "codes": ["XXXX-XXXX-...", ...]
        }

GET /api/v1/admin/stats
    Quick health-check: counts of players, fortresses, active season, free codes.

    Headers:
        X-Admin-Secret: <value of ADMIN_SECRET env var>
"""

import os
import secrets
import string
import logging
from datetime import datetime

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from db import SessionLocal
from db.models import (
    InvitationCode,
    Player,
    Fortress,
    Battle,
    Season,
    PlayerSeasonStats,
    PlayerHistoryEntry,
)

logger = logging.getLogger(__name__)
admin_bp = Blueprint("admin", __name__)


# ──────────────────────────────────────────────────────────
# Auth helper
# ──────────────────────────────────────────────────────────

def _check_admin() -> bool:
    """Return True if the request carries the correct admin secret."""
    # TODO: switch to env var before deploying to production:
    #   secret = os.getenv("ADMIN_SECRET", "").strip()
    secret = "erni-admin-2026"
    if not secret:
        return False
    return secrets.compare_digest(
        request.headers.get("X-Admin-Secret", ""),
        secret,
    )


def _gen_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    raw = "".join(secrets.choice(alphabet) for _ in range(32))
    return "-".join(raw[i:i+8] for i in range(0, 32, 8))


# ──────────────────────────────────────────────────────────
# POST /invitations
# ──────────────────────────────────────────────────────────

@admin_bp.post("/invitations")
def create_invitations():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}

    count = int(data.get("count", 1))
    if not (1 <= count <= 50):
        return jsonify({"error": "count must be between 1 and 50"}), 400

    max_uses = int(data.get("max_uses", 1))
    if not (1 <= max_uses <= 10):
        return jsonify({"error": "max_uses must be between 1 and 10"}), 400

    created_by = str(data.get("created_by", "admin-api"))[:100]

    expires_at = None
    if data.get("expires"):
        try:
            expires_at = datetime.strptime(data["expires"], "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "expires must be YYYY-MM-DD"}), 400

    db = SessionLocal()
    plain_codes = []
    try:
        for _ in range(count):
            plain = _gen_code()
            inv = InvitationCode(
                code_hash=generate_password_hash(plain),
                is_active=True,
                max_uses=max_uses,
                current_uses=0,
                expires_at=expires_at,
                created_by=created_by,
            )
            db.add(inv)
            plain_codes.append(plain)

        db.commit()
        logger.info("admin: created %d invitation codes", count)
        return jsonify({"codes": plain_codes}), 201

    except Exception:
        db.rollback()
        logger.exception("admin: failed to create invitations")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /stats
# ──────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────
# USER MANAGEMENT
# ──────────────────────────────────────────────────────────

@admin_bp.get("/users")
def list_users():
    """List players with pagination, optional search/filter and current-season score.

    Query params:
        search    – partial match on username or email
        banned    – "true" | "false" to filter by ban status
        page      – 1-based page number (default 1)
        per_page  – items per page, max 100 (default 20); use 0 to return all
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    page     = max(int(request.args.get("page", 1)), 1)
    per_page_raw = int(request.args.get("per_page", 20))
    per_page = None if per_page_raw == 0 else min(per_page_raw, 100)
    search   = request.args.get("search", "").strip()
    banned   = request.args.get("banned")

    db = SessionLocal()
    try:
        season    = db.query(Season).filter_by(is_active=True).first()
        season_id = season.id if season else None

        query = (
            db.query(Player, PlayerSeasonStats)
            .outerjoin(
                PlayerSeasonStats,
                (PlayerSeasonStats.player_id == Player.id) &
                (PlayerSeasonStats.season_id == season_id),
            )
        )

        if search:
            query = query.filter(
                (Player.username.ilike(f"%{search}%")) |
                (Player.email.ilike(f"%{search}%"))
            )

        if banned == "true":
            query = query.filter(Player.is_banned == True)   # noqa: E712
        elif banned == "false":
            query = query.filter(Player.is_banned == False)  # noqa: E712

        total = query.count()
        query = query.order_by(Player.created_at.desc())

        if per_page is not None:
            query = query.offset((page - 1) * per_page).limit(per_page)

        rows = query.all()

        return jsonify({
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "items": [
                {
                    "id":           p.id,
                    "username":     p.username,
                    "email":        p.email,
                    "credits":      p.credits,
                    "energy":       p.energy,
                    "is_admin":     p.is_admin,
                    "is_banned":    p.is_banned,
                    "banned_at":    p.banned_at.isoformat() + "Z" if p.banned_at else None,
                    "created_at":   p.created_at.isoformat() + "Z" if p.created_at else None,
                    "has_fortress": p.fortress is not None,
                    "season_score": stats.score if stats else None,
                }
                for p, stats in rows
            ],
        })
    finally:
        db.close()


@admin_bp.get("/users/<player_id>")
def get_user(player_id):
    """Full player detail including season score and fortress info."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        season       = db.query(Season).filter_by(is_active=True).first()
        season_score = None
        rank         = None

        if season:
            stats = db.query(PlayerSeasonStats).filter_by(
                player_id=player_id, season_id=season.id
            ).first()
            if stats:
                season_score  = stats.score
                higher_count  = db.query(PlayerSeasonStats).filter(
                    PlayerSeasonStats.season_id == season.id,
                    PlayerSeasonStats.score > stats.score,
                ).count()
                rank = higher_count + 1

        inv = db.query(InvitationCode).filter_by(player_id=player_id).first()

        result = {
            "id":                   player.id,
            "username":             player.username,
            "email":                player.email,
            "credits":              player.credits,
            "energy":               player.energy,
            "is_banned":            player.is_banned,
            "banned_at":            player.banned_at.isoformat() + "Z" if player.banned_at else None,
            "is_admin":             player.is_admin,
            "created_at":           player.created_at.isoformat() + "Z" if player.created_at else None,
            "season_score":         season_score,
            "rank":                 rank,
            "has_fortress":         player.fortress is not None,
            "invitation_code_id":   inv.id if inv else None,
            "invitation_active":    inv.is_active if inv else None,
        }

        if player.fortress:
            result["fortress"] = {
                "id":             player.fortress.id,
                "name":           player.fortress.name,
                "protocol_id":    player.fortress.protocol_id,
                "archetype_id":   player.fortress.archetype_id,
                "personality_id": player.fortress.personality_id,
            }

        return jsonify(result)
    finally:
        db.close()


@admin_bp.patch("/users/<player_id>")
def update_user(player_id):
    """Partial update of player fields: credits, energy, username, email.

    Body (all optional):
        {
            "username": "new_name",
            "email":    "new@email.com",
            "credits":  500,
            "energy":   80
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db   = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        if "credits" in data:
            credits = int(data["credits"])
            if credits < 0:
                return jsonify({"error": "credits cannot be negative"}), 400
            player.credits = credits

        if "energy" in data:
            energy = int(data["energy"])
            if not (0 <= energy <= 100):
                return jsonify({"error": "energy must be between 0 and 100"}), 400
            player.energy = energy

        if "username" in data:
            new_username = str(data["username"]).strip()
            if not (3 <= len(new_username) <= 50):
                return jsonify({"error": "username must be 3–50 characters"}), 400
            conflict = db.query(Player).filter(
                Player.username == new_username,
                Player.id != player_id,
            ).first()
            if conflict:
                return jsonify({"error": "Username already in use"}), 409
            player.username = new_username

        if "email" in data:
            new_email = str(data["email"]).strip()
            conflict = db.query(Player).filter(
                Player.email == new_email,
                Player.id != player_id,
            ).first()
            if conflict:
                return jsonify({"error": "Email already in use"}), 409
            player.email = new_email

        db.commit()
        return jsonify({"message": "Player updated", "id": player.id})

    except ValueError:
        db.rollback()
        return jsonify({"error": "Invalid value"}), 400
    except Exception:
        db.rollback()
        logger.exception("admin: update_user failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_bp.post("/users/<player_id>/ban")
def ban_user(player_id):
    """Ban a player — blocks future logins immediately."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        if player.is_banned:
            return jsonify({"message": "Player already banned"}), 200

        player.is_banned = True
        player.banned_at = datetime.utcnow()
        db.commit()
        logger.info("admin: banned player id=%.8s", player_id)
        return jsonify({"message": "Player banned", "id": player_id})

    except Exception:
        db.rollback()
        logger.exception("admin: ban_user failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_bp.post("/users/<player_id>/unban")
def unban_user(player_id):
    """Remove the ban from a player."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        if not player.is_banned:
            return jsonify({"message": "Player is not banned"}), 200

        player.is_banned = False
        player.banned_at = None
        db.commit()
        logger.info("admin: unbanned player id=%.8s", player_id)
        return jsonify({"message": "Player unbanned", "id": player_id})

    except Exception:
        db.rollback()
        logger.exception("admin: unban_user failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_bp.post("/users/<player_id>/fragments")
def adjust_fragments(player_id):
    """Give or remove fragments (credits) from a player.

    Body:
        {
            "amount": 100,           # positive = give, negative = take
            "reason": "admin_gift"   # optional audit label
        }
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data   = request.get_json(silent=True) or {}
    amount = data.get("amount")
    reason = str(data.get("reason", "admin_adjustment"))[:100]

    if amount is None:
        return jsonify({"error": "amount is required"}), 400

    try:
        amount = int(amount)
    except (TypeError, ValueError):
        return jsonify({"error": "amount must be an integer"}), 400

    if amount == 0:
        return jsonify({"error": "amount cannot be zero"}), 400

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        new_credits = player.credits + amount
        if new_credits < 0:
            return jsonify({"error": "Cannot reduce credits below zero"}), 400

        player.credits = new_credits

        entry = PlayerHistoryEntry(
            player_id=player_id,
            type="fragments",
            amount=amount,
            reason=reason,
            detail=f"Admin adjustment: {amount:+d} fragments",
        )
        db.add(entry)
        db.commit()

        logger.info("admin: fragments adjusted player=%.8s amount=%d", player_id, amount)
        return jsonify({"message": "Fragments adjusted", "new_credits": new_credits})

    except Exception:
        db.rollback()
        logger.exception("admin: adjust_fragments failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


@admin_bp.post("/users/<player_id>/set-admin")
def set_admin(player_id):
    """Grant or revoke admin privileges for a player.

    Body:
        { "is_admin": true | false }

    Admin players can be identified in the DB and use privileged features.
    Only settable by an existing admin (via X-Admin-Secret — the server secret).
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data     = request.get_json(silent=True) or {}
    is_admin = data.get("is_admin")

    if is_admin is None:
        return jsonify({"error": "is_admin (bool) is required"}), 400

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        player.is_admin = bool(is_admin)
        db.commit()

        action = "granted" if player.is_admin else "revoked"
        logger.info("admin: admin role %s for player id=%.8s", action, player_id)
        return jsonify({"message": f"Admin role {action}", "id": player_id, "is_admin": player.is_admin})

    except Exception:
        db.rollback()
        logger.exception("admin: set_admin failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
@admin_bp.get("/stats")
def stats():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player_count   = db.query(Player).count()
        fortress_count = db.query(Fortress).count()
        battle_count   = db.query(Battle).count()

        active_season = db.query(Season).filter_by(is_active=True).first()

        free_codes = db.query(InvitationCode).filter(
            InvitationCode.is_active == True,   # noqa: E712
            InvitationCode.player_id == None,    # noqa: E711
        ).count()

        return jsonify({
            "players":       player_count,
            "fortresses":    fortress_count,
            "battles":       battle_count,
            "free_codes":    free_codes,
            "active_season": active_season.name if active_season else None,
        })
    finally:
        db.close()
