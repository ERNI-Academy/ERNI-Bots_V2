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


from db import SessionLocal
from db.models import (
    InvitationCode,
    Player,
    Fortress,
    FortressConstraint,
    FortressSeasonStats,
    Battle,
    BattleMessage,
    Boss,
    Season,
    PlayerSeasonStats,
    PlayerHistoryEntry,
    PlayerWord,
    PlayerBossStats,
    PlayerAsset,
    ActivityLog,
    ProtectedWord,
    Protocol,
    Archetype,
    Personality,
)

logger = logging.getLogger(__name__)
admin_bp = Blueprint("admin", __name__)


# ──────────────────────────────────────────────────────────
# Auth helper
# ──────────────────────────────────────────────────────────

def _check_admin() -> bool:
    """Return True if the request carries the correct admin secret."""
    secret = os.getenv("ADMIN_SECRET", "").strip()
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
            tag_value = str(data.get("tag", ""))[:100] or None
            inv = InvitationCode(
                code=plain,
                is_active=True,
                max_uses=max_uses,
                current_uses=0,
                expires_at=expires_at,
                created_by=created_by,
                tag=tag_value,
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
# GET /invitations
# ──────────────────────────────────────────────────────────

@admin_bp.get("/invitations")
def list_invitations():
    """
    List invitation codes with pagination and filters.

    Query params:
        page      – page number (default 1)
        per_page  – items per page (default 50, max 200)
        status    – "free" | "claimed" | "inactive" | "expired" (default: all)
        q         – search by created_by or player username
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    from sqlalchemy import or_, and_
    from db.models import Player as _Player

    page       = max(1, int(request.args.get("page", 1)))
    per_page   = min(200, max(1, int(request.args.get("per_page", 50))))
    status_filter = request.args.get("status", "").strip().lower()
    tag_filter = (request.args.get("tag") or "").strip().lower()
    q          = (request.args.get("q") or "").strip().lower()
    sort_by    = request.args.get("sort_by",  "created_at")
    sort_dir   = request.args.get("sort_dir", "desc")

    SORT_COLS = {
        "created_at":   InvitationCode.created_at,
        "last_used_at": InvitationCode.last_used_at,
        "expires_at":   InvitationCode.expires_at,
        "current_uses": InvitationCode.current_uses,
        "created_by":   InvitationCode.created_by,
        "code":         InvitationCode.code,
    }

    db = SessionLocal()
    try:
        query = db.query(InvitationCode)

        if status_filter == "free":
            query = query.filter(
                InvitationCode.is_active == True,   # noqa: E712
                InvitationCode.player_id == None,   # noqa: E711
            )
        elif status_filter == "claimed":
            query = query.filter(InvitationCode.player_id != None)  # noqa: E711
        elif status_filter == "inactive":
            query = query.filter(InvitationCode.is_active == False)  # noqa: E712
        elif status_filter == "expired":
            now = datetime.utcnow()
            query = query.filter(
                InvitationCode.expires_at != None,   # noqa: E711
                InvitationCode.expires_at < now,
            )

        if tag_filter:
            query = query.filter(InvitationCode.tag == tag_filter)

        if q:
            from sqlalchemy.orm import joinedload
            query = query.outerjoin(InvitationCode.player).filter(
                or_(
                    InvitationCode.created_by.ilike(f"%{q}%"),
                    _Player.username.ilike(f"%{q}%"),
                )
            )

        total = query.count()

        sort_fields   = [f.strip() for f in sort_by.split(",")]
        sort_dirs_lst = [d.strip() for d in sort_dir.split(",")]
        order_clauses = []
        for i, sf in enumerate(sort_fields):
            col = SORT_COLS.get(sf)
            if col is None:
                continue
            sd = sort_dirs_lst[i] if i < len(sort_dirs_lst) else "asc"
            order_clauses.append(col.desc() if sd == "desc" else col.asc())
        if not order_clauses:
            order_clauses = [InvitationCode.created_at.desc()]

        codes = (
            query.order_by(*order_clauses)
                 .offset((page - 1) * per_page)
                 .limit(per_page)
                 .all()
        )

        now = datetime.utcnow()

        def _serialize(inv: InvitationCode) -> dict:
            expired = (inv.expires_at is not None and inv.expires_at < now)
            if inv.player_id:
                tag = "claimed"
            elif not inv.is_active:
                tag = "inactive"
            elif expired:
                tag = "expired"
            else:
                tag = "free"

            return {
                "id":           inv.id,
                "code":         inv.code,
                "status":       tag,
                "is_active":    inv.is_active,
                "max_uses":     inv.max_uses,
                "current_uses": inv.current_uses,
                "expires_at":   inv.expires_at.isoformat() if inv.expires_at else None,
                "created_at":   inv.created_at.isoformat() if inv.created_at else None,
                "created_by":   inv.created_by,
                "tag":          inv.tag,
                "last_used_at": inv.last_used_at.isoformat() if inv.last_used_at else None,
                "player": {
                    "id":       inv.player.id,
                    "username": inv.player.username,
                    "email":    inv.player.email,
                } if inv.player else None,
            }

        return jsonify({
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    max(1, (total + per_page - 1) // per_page),
            "items":    [_serialize(c) for c in codes],
        })
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PATCH /invitations/<id>  – toggle is_active
# ──────────────────────────────────────────────────────────

@admin_bp.patch("/invitations/<inv_id>")
def update_invitation(inv_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        inv = db.query(InvitationCode).filter_by(id=inv_id).first()
        if not inv:
            return jsonify({"error": "Invitación no encontrada"}), 404

        if "is_active" in data:
            inv.is_active = bool(data["is_active"])
        if "code" in data:
            new_code = str(data["code"]).strip()
            if not new_code:
                return jsonify({"error": "El código no puede estar vacío"}), 400
            inv.code = new_code
        if "tag" in data:
            inv.tag = str(data["tag"])[:100] or None
        db.commit()

        now = datetime.utcnow()
        expired = inv.expires_at is not None and inv.expires_at < now
        if inv.player_id:
            tag = "claimed"
        elif not inv.is_active:
            tag = "inactive"
        elif expired:
            tag = "expired"
        else:
            tag = "free"

        return jsonify({"id": inv.id, "is_active": inv.is_active, "status": tag})
    except Exception:
        db.rollback()
        logger.exception("admin: update_invitation failed id=%s", inv_id)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /invitations/<id>
# ──────────────────────────────────────────────────────────

@admin_bp.delete("/invitations/<inv_id>")
def delete_invitation(inv_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        inv = db.query(InvitationCode).filter_by(id=inv_id).first()
        if not inv:
            return jsonify({"error": "Invitación no encontrada"}), 404
        db.delete(inv)
        db.commit()
        logger.info("admin: deleted invitation id=%s", inv_id)
        return jsonify({"ok": True})
    except Exception:
        db.rollback()
        logger.exception("admin: delete_invitation failed id=%s", inv_id)
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
        is_bot    – "true" | "false" to filter by bot status
        is_admin  – "true" | "false" to filter by admin status
        sort_by   – column to sort by: username | email | credits | created_at | season_score (default: created_at)
        sort_dir  – asc | desc (default: desc)
        page      – 1-based page number (default 1)
        per_page  – items per page, max 100 (default 20); use 0 to return all
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    page     = max(int(request.args.get("page", 1)), 1)
    per_page_raw = int(request.args.get("per_page", 20))
    per_page = None if per_page_raw == 0 else min(per_page_raw, 100)
    search        = request.args.get("search", "").strip()
    banned        = request.args.get("banned")
    is_bot        = request.args.get("is_bot")
    is_admin_filter = request.args.get("is_admin")
    sort_by       = request.args.get("sort_by",  "created_at")
    sort_dir = request.args.get("sort_dir", "desc")

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

        if is_bot == "true":
            query = query.filter(Player.is_bot == True)      # noqa: E712
        elif is_bot == "false":
            query = query.filter(Player.is_bot == False)     # noqa: E712

        if is_admin_filter == "true":
            query = query.filter(Player.is_admin == True)    # noqa: E712
        elif is_admin_filter == "false":
            query = query.filter(Player.is_admin == False)   # noqa: E712

        total = query.count()

        _sort_cols = {
            "username":     Player.username,
            "email":        Player.email,
            "credits":      Player.credits,
            "created_at":   Player.created_at,
            "season_score": PlayerSeasonStats.score,
        }
        sort_fields = [f.strip() for f in sort_by.split(",")]
        sort_dirs   = [d.strip() for d in sort_dir.split(",")]
        order_clauses = []
        for i, sf in enumerate(sort_fields):
            col = _sort_cols.get(sf)
            if col is None:
                continue
            sd = sort_dirs[i] if i < len(sort_dirs) else "asc"
            order_clauses.append(col.asc().nullslast() if sd == "asc" else col.desc().nullslast())
        if not order_clauses:
            order_clauses = [Player.created_at.desc().nullslast()]
        query = query.order_by(*order_clauses)

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
                    "is_bot":       p.is_bot,
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


@admin_bp.get("/users/<player_id>/activity")
def get_player_activity(player_id):
    """Return recent battles, history entries, boss stats and invitations for a player."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        # ── Recent battles (last 25 as attacker) ──────────────────────────
        battles_rows = (
            db.query(Battle)
            .filter_by(attacker_id=player_id)
            .order_by(Battle.created_at.desc())
            .limit(25)
            .all()
        )
        battles = []
        for b in battles_rows:
            if b.type == "pve" and b.boss:
                target, target_type = b.boss.name, "boss"
            elif b.fortress:
                target, target_type = b.fortress.name, "fortress"
            else:
                target, target_type = None, None
            battles.append({
                "id":           b.id,
                "created_at":   b.created_at.isoformat() + "Z" if b.created_at else None,
                "type":         b.type,
                "status":       b.status,
                "target":       target,
                "target_type":  target_type,
                "turn_count":   b.turn_count,
                "max_turns":    b.max_turns,
                "secret_word":  b.secret_word,
                "player_guess": b.player_guess,
            })

        # ── History entries (last 50) ────────────────────────────────────
        history_rows = (
            db.query(PlayerHistoryEntry)
            .filter_by(player_id=player_id)
            .order_by(PlayerHistoryEntry.created_at.desc())
            .limit(50)
            .all()
        )
        history = [
            {
                "id":         h.id,
                "type":       h.type,
                "amount":     h.amount,
                "reason":     h.reason,
                "detail":     h.detail,
                "created_at": h.created_at.isoformat() + "Z" if h.created_at else None,
            }
            for h in history_rows
        ]

        # ── Boss stats ────────────────────────────────────────────────────
        boss_stats_rows = (
            db.query(PlayerBossStats)
            .filter_by(player_id=player_id)
            .all()
        )
        boss_stats = [
            {
                "boss_id":      bs.boss_id,
                "boss_name":    bs.boss.name if bs.boss else None,
                "defeated":     bs.defeated,
                "assigned_word": bs.assigned_word,
                "created_at":   bs.created_at.isoformat() + "Z" if bs.created_at else None,
            }
            for bs in boss_stats_rows
        ]

        # ── Invitations generated BY this player (referral codes) ─────────
        generated_invitations = (
            db.query(InvitationCode)
            .filter(
                (InvitationCode.created_by == player_id) |
                (InvitationCode.created_by == player.username)
            )
            .order_by(InvitationCode.created_at.desc())
            .all()
        )
        invitations = [
            {
                "id":           inv.id,
                "code":         inv.code,
                "is_active":    inv.is_active,
                "max_uses":     inv.max_uses,
                "current_uses": inv.current_uses,
                "tag":          inv.tag,
                "created_at":   inv.created_at.isoformat() + "Z" if inv.created_at else None,
                "expires_at":   inv.expires_at.isoformat() + "Z" if inv.expires_at else None,
            }
            for inv in generated_invitations
        ]

        # ── Invitation used to register ───────────────────────────────────
        used_invitation = db.query(InvitationCode).filter_by(player_id=player_id).first()
        used_inv_data = None
        if used_invitation:
            used_inv_data = {
                "id":         used_invitation.id,
                "code":       used_invitation.code,
                "tag":        used_invitation.tag,
                "created_by": used_invitation.created_by,
            }

        return jsonify({
            "battles":          battles,
            "history":          history,
            "boss_stats":       boss_stats,
            "invitations":      invitations,
            "used_invitation":  used_inv_data,
        })
    finally:
        db.close()


@admin_bp.patch("/users/<player_id>")
def update_user(player_id):
    """Partial update of player fields: credits, energy, username, email, is_admin, is_bot.

    Body (all optional):
        {
            "username": "new_name",
            "email":    "new@email.com",
            "credits":  500,
            "energy":   80,
            "is_admin": true,
            "is_bot":   false
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

        if "is_admin" in data:
            player.is_admin = bool(data["is_admin"])

        if "is_bot" in data:
            player.is_bot = bool(data["is_bot"])

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


# ──────────────────────────────────────────────────────────
# DELETE /users/<player_id>  — hard delete
# ──────────────────────────────────────────────────────────

@admin_bp.delete("/users/<player_id>")
def delete_player(player_id):
    """Hard-delete a player and ALL associated data.

    Deletes in FK-safe order:
    activity_logs, player_boss_stats, player_history_entries,
    player_words, player_assets, player_season_stats,
    invitation_codes (unlinked), attacker battles + messages,
    defender battles + messages (via fortress), fortress_constraints,
    fortress_season_stats, fortress, player.
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=player_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        username = player.username

        # 1. Activity logs (actor)
        db.query(ActivityLog).filter_by(actor_id=player_id).delete()

        # 2. Boss stats
        db.query(PlayerBossStats).filter_by(player_id=player_id).delete()

        # 3. History entries
        db.query(PlayerHistoryEntry).filter_by(player_id=player_id).delete()

        # 4. Player words
        db.query(PlayerWord).filter_by(player_id=player_id).delete()

        # 5. Store assets
        db.query(PlayerAsset).filter_by(player_id=player_id).delete()

        # 6. Season stats
        db.query(PlayerSeasonStats).filter_by(player_id=player_id).delete()

        # 7. Unlink invitation codes (preserve the codes themselves)
        db.query(InvitationCode).filter_by(player_id=player_id).update(
            {"player_id": None}, synchronize_session=False
        )

        # 8. Battles where this player is the attacker (+ messages)
        attacker_ids = [
            b.id for b in db.query(Battle.id).filter_by(attacker_id=player_id)
        ]
        if attacker_ids:
            db.query(BattleMessage).filter(
                BattleMessage.battle_id.in_(attacker_ids)
            ).delete(synchronize_session=False)
            db.query(Battle).filter(
                Battle.id.in_(attacker_ids)
            ).delete(synchronize_session=False)

        # 9. Player's fortress and related data
        fortress = db.query(Fortress).filter_by(owner_id=player_id).first()
        if fortress:
            # Battles against this fortress (+ messages)
            fortress_battle_ids = [
                b.id for b in db.query(Battle.id).filter_by(fortress_id=fortress.id)
            ]
            if fortress_battle_ids:
                db.query(BattleMessage).filter(
                    BattleMessage.battle_id.in_(fortress_battle_ids)
                ).delete(synchronize_session=False)
                db.query(Battle).filter(
                    Battle.id.in_(fortress_battle_ids)
                ).delete(synchronize_session=False)

            db.query(FortressConstraint).filter_by(fortress_id=fortress.id).delete()
            db.query(FortressSeasonStats).filter_by(fortress_id=fortress.id).delete()
            db.delete(fortress)
            db.flush()

        # 10. Player
        db.delete(player)
        db.commit()

        logger.info("admin: hard-deleted player id=%.8s (%s)", player_id, username)
        return jsonify({"message": f"Player '{username}' deleted"}), 200

    except Exception:
        db.rollback()
        logger.exception("admin: delete_player failed")
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
# BATTLE MANAGEMENT
# ──────────────────────────────────────────────────────────

@admin_bp.get("/battles")
def list_battles():
    """List battles with pagination and optional filters.

    Query params:
        status   – active | won | lost | expired
        type     – pvp | pve
        search   – partial match on attacker username
        page     – 1-based (default 1)
        per_page – max 100 (default 20)
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    try:
        page     = max(int(request.args.get("page", 1)), 1)
        per_page = min(int(request.args.get("per_page", 20)), 100)
    except (TypeError, ValueError):
        page, per_page = 1, 20

    status_f = request.args.get("status", "").strip()
    type_f   = request.args.get("type",   "").strip()
    search   = request.args.get("search", "").strip()

    db = SessionLocal()
    try:
        query = db.query(Battle)

        if status_f:
            query = query.filter(Battle.status == status_f)
        if type_f:
            query = query.filter(Battle.type == type_f)
        if search:
            query = query.join(Player, Player.id == Battle.attacker_id).filter(
                Player.username.ilike(f"%{search}%")
            )

        total = query.count()
        rows  = (
            query
            .order_by(Battle.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        def _serialize(b: Battle) -> dict:
            if b.type == "pve" and b.boss:
                target, target_type = b.boss.name, "boss"
            elif b.fortress:
                target, target_type = b.fortress.name, "fortress"
            else:
                target, target_type = None, None

            fortress_owner = b.fortress.owner.username if b.fortress and b.fortress.owner else None

            return {
                "id":             b.id,
                "created_at":     b.created_at.isoformat() + "Z" if b.created_at else None,
                "updated_at":     b.updated_at.isoformat() + "Z" if b.updated_at else None,
                "attacker":       b.attacker.username if b.attacker else None,
                "attacker_id":    b.attacker_id,
                "target":         target,
                "target_type":    target_type,
                "fortress_owner": fortress_owner,
                "type":           b.type,
                "status":         b.status,
                "turn_count":     b.turn_count,
                "max_turns":      b.max_turns,
                "secret_word":    b.secret_word,
                "player_guess":   b.player_guess,
            }

        return jsonify({
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "items":    [_serialize(b) for b in rows],
        })
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
@admin_bp.get("/battles/<battle_id>")
def get_battle_detail(battle_id):
    """Return full battle detail including message history."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        b = db.query(Battle).filter(Battle.id == battle_id).first()
        if not b:
            return jsonify({"error": "Not found"}), 404

        if b.type == "pve" and b.boss:
            target, target_type = b.boss.name, "boss"
        elif b.fortress:
            target, target_type = b.fortress.name, "fortress"
        else:
            target, target_type = None, None

        fortress_owner = b.fortress.owner.username if b.fortress and b.fortress.owner else None

        messages = [
            {
                "id":         m.id,
                "role":       m.role,
                "text":       m.text,
                "created_at": m.created_at.isoformat() + "Z" if m.created_at else None,
            }
            for m in b.messages
        ]

        return jsonify({
            "id":             b.id,
            "created_at":     b.created_at.isoformat() + "Z" if b.created_at else None,
            "updated_at":     b.updated_at.isoformat() + "Z" if b.updated_at else None,
            "session_id":     b.session_id,
            "attacker":       b.attacker.username if b.attacker else None,
            "attacker_id":    b.attacker_id,
            "target":         target,
            "target_type":    target_type,
            "fortress_owner": fortress_owner,
            "type":           b.type,
            "status":         b.status,
            "turn_count":     b.turn_count,
            "max_turns":      b.max_turns,
            "secret_word":    b.secret_word,
            "player_guess":   b.player_guess,
            "messages":       messages,
        })
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
@admin_bp.get("/battles/recent")
def recent_battles():
    """Return the last N battles (default 10, max 50).

    Response fields per item:
        id, created_at, attacker, target, target_type (fortress|boss), type (pvp|pve), status
    """
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    try:
        limit = min(int(request.args.get("limit", 10)), 50)
    except (TypeError, ValueError):
        limit = 10

    db = SessionLocal()
    try:
        rows = (
            db.query(Battle)
            .order_by(Battle.created_at.desc())
            .limit(limit)
            .all()
        )

        items = []
        for b in rows:
            if b.type == "pve" and b.boss:
                target      = b.boss.name
                target_type = "boss"
            elif b.fortress:
                target      = b.fortress.name
                target_type = "fortress"
            else:
                target      = None
                target_type = None

            items.append({
                "id":          b.id,
                "created_at":  b.created_at.isoformat() + "Z" if b.created_at else None,
                "attacker":    b.attacker.username if b.attacker else None,
                "target":      target,
                "target_type": target_type,
                "type":        b.type,
                "status":      b.status,
            })

        return jsonify({"items": items})
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
@admin_bp.get("/stats")
def stats():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player_count   = db.query(Player).filter(Player.is_bot == False).count()  # noqa: E712
        fortress_count = (
            db.query(Fortress)
            .join(Player, Fortress.owner_id == Player.id)
            .filter(Player.is_bot == False)  # noqa: E712
            .count()
        )
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


# ──────────────────────────────────────────────────────────
# GET /fortresses
# ──────────────────────────────────────────────────────────

@admin_bp.get("/fortresses")
def list_fortresses():
    """List all fortresses with owner, protocol and archetype info."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        fortresses = (
            db.query(Fortress)
            .order_by(Fortress.created_at.desc())
            .all()
        )
        result = []
        for f in fortresses:
            result.append({
                "id":                   f.id,
                "name":                 f.name,
                "owner":                f.owner.username if f.owner else None,
                "owner_id":             f.owner_id,
                "is_bot":               f.owner.is_bot if f.owner else False,
                "protocol":             f.protocol.name if f.protocol else None,
                "archetype":            f.archetype.name if f.archetype else None,
                "personality":          f.personality.name if f.personality else None,
                "protected_word":       f.protected_word,
                "created_at":           f.created_at.isoformat() + "Z" if f.created_at else None,
                "last_reconfigured_at": f.last_reconfigured_at.isoformat() + "Z" if f.last_reconfigured_at else None,
            })
        return jsonify(result)
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /fortresses/catalog
# ──────────────────────────────────────────────────────────

@admin_bp.get("/fortresses/catalog")
def get_fortress_catalog():
    """Return all protocols, archetypes and personalities to populate fortress edit dropdowns."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        protocols    = db.query(Protocol).order_by(Protocol.name).all()
        archetypes   = db.query(Archetype).order_by(Archetype.name).all()
        personalities = db.query(Personality).order_by(Personality.name).all()

        return jsonify({
            "protocols":    [{"id": p.id, "name": p.name} for p in protocols],
            "archetypes":   [{"id": a.id, "name": a.name} for a in archetypes],
            "personalities": [{"id": p.id, "name": p.name} for p in personalities],
        })
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# GET /fortresses/<fortress_id>
# ──────────────────────────────────────────────────────────

@admin_bp.get("/fortresses/<fortress_id>")
def get_fortress(fortress_id: str):
    """Fortress detail: season stats + owner's available player words."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        f = db.query(Fortress).filter_by(id=fortress_id).first()
        if not f:
            return jsonify({"error": "Fortress not found"}), 404

        # Season stats
        stats = (
            db.query(FortressSeasonStats)
            .filter_by(fortress_id=fortress_id)
            .all()
        )
        stats_list = [{
            "season_id":    s.season_id,
            "season_name":  s.season.name if s.season else s.season_id,
            "attack_count": s.attack_count,
            "defeat_count": s.defeat_count,
            "status":       s.status,
            "updated_at":   s.updated_at.isoformat() + "Z" if s.updated_at else None,
        } for s in stats]

        # Owner's available player words
        player_words = (
            db.query(PlayerWord)
            .filter_by(player_id=f.owner_id)
            .all()
        )
        words_list = [{
            "id":   pw.word.id,
            "word": pw.word.word,
        } for pw in player_words if pw.word]

        return jsonify({
            "id":                   f.id,
            "name":                 f.name,
            "story":                f.story,
            "owner":                f.owner.username if f.owner else None,
            "owner_id":             f.owner_id,
            "is_bot":               f.owner.is_bot if f.owner else False,
            "protocol":             f.protocol.name if f.protocol else None,
            "protocol_id":          f.protocol_id,
            "archetype":            f.archetype.name if f.archetype else None,
            "archetype_id":         f.archetype_id,
            "personality":          f.personality.name if f.personality else None,
            "personality_id":       f.personality_id,
            "protected_word":       f.protected_word,
            "created_at":           f.created_at.isoformat() + "Z" if f.created_at else None,
            "last_reconfigured_at": f.last_reconfigured_at.isoformat() + "Z" if f.last_reconfigured_at else None,
            "season_stats":         stats_list,
            "player_words":         words_list,
        })
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PATCH /fortresses/<fortress_id>
# ──────────────────────────────────────────────────────────

@admin_bp.route("/fortresses/<fortress_id>", methods=["PATCH"])
def update_fortress(fortress_id: str):
    """Update fortress fields: name, story, protected_word, protocol_id, archetype_id, personality_id."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}

    db = SessionLocal()
    try:
        f = db.query(Fortress).filter_by(id=fortress_id).first()
        if not f:
            return jsonify({"error": "Fortress not found"}), 404

        if "name" in data:
            name = str(data["name"]).strip()
            if not name or len(name) > 100:
                return jsonify({"error": "Invalid name (1-100 chars)"}), 400
            f.name = name

        if "story" in data:
            f.story = str(data["story"]).strip()

        if "protected_word" in data:
            word = str(data["protected_word"]).strip().upper()
            if not word or len(word) > 64:
                return jsonify({"error": "Invalid protected_word (1-64 chars)"}), 400
            f.protected_word = word

        if "protocol_id" in data:
            if not db.query(Protocol).filter_by(id=data["protocol_id"]).first():
                return jsonify({"error": "Protocol not found"}), 404
            f.protocol_id = data["protocol_id"]

        if "archetype_id" in data:
            if not db.query(Archetype).filter_by(id=data["archetype_id"]).first():
                return jsonify({"error": "Archetype not found"}), 404
            f.archetype_id = data["archetype_id"]

        if "personality_id" in data:
            if not db.query(Personality).filter_by(id=data["personality_id"]).first():
                return jsonify({"error": "Personality not found"}), 404
            f.personality_id = data["personality_id"]

        f.last_reconfigured_at = datetime.utcnow()
        db.commit()
        db.refresh(f)

        logger.info("admin: updated fortress id=%.8s", fortress_id)
        return jsonify({
            "id":                   f.id,
            "name":                 f.name,
            "story":                f.story,
            "protected_word":       f.protected_word,
            "protocol":             f.protocol.name if f.protocol else None,
            "protocol_id":          f.protocol_id,
            "archetype":            f.archetype.name if f.archetype else None,
            "archetype_id":         f.archetype_id,
            "personality":          f.personality.name if f.personality else None,
            "personality_id":       f.personality_id,
            "last_reconfigured_at": f.last_reconfigured_at.isoformat() + "Z",
        })

    except Exception:
        db.rollback()
        logger.exception("admin: update_fortress failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
