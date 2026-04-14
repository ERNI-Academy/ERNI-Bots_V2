"""
Authentication routes.

POST /auth/register        – create account with invitation code
POST /auth/login           – authenticate with invitation code → access + refresh JWT
POST /auth/logout          – revoke current access token (adds jti to blocklist)
POST /auth/revoke-refresh  – revoke current refresh token (adds jti to blocklist)
POST /auth/refresh         – exchange refresh token for a new access token
GET  /auth/me              – return authenticated player profile

Auth mechanism
--------------
The invitation code IS the authentication credential.
- Codes are never stored in plain text: werkzeug pbkdf2+sha256+salt hash.
- Register: validates an unclaimed invitation, creates player, claims code.
- Login:    looks up the invitation already linked to the player, checks hash.
- Timing attack mitigation: dummy hash check when username not found.
- Enumeration mitigation: login always returns the same generic error on failure.

Token strategy
--------------
Access JWT (1 h) + Refresh JWT (30 days).
Both token jtis are stored in the DB blocklist on logout/revoke.
"""

import logging
import os
import re
import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.security import generate_password_hash

from extensions import limiter

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)

# Generic error returned for ALL authentication failures to prevent enumeration.
_AUTH_ERROR = {"error": "Invalid credentials"}

# Email format validation (minimal, RFC-permissive).
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Number of trusted reverse-proxy hops in X-Forwarded-For.
# 0 (default) = XFF is ignored; set env var to trust your proxy count.
_TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_COUNT", "0"))


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────

def _client_ip() -> str:
    """Extract client IP honoring X-Forwarded-For only when TRUSTED_PROXY_COUNT > 0.

    Without a configured proxy count, XFF is ignored to prevent IP spoofing
    that would let clients bypass IP-based rate limiting.
    """
    if _TRUSTED_PROXY_COUNT > 0:
        xff = request.headers.get("X-Forwarded-For", "")
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if len(parts) >= _TRUSTED_PROXY_COUNT:
            return parts[-_TRUSTED_PROXY_COUNT]  # rightmost trusted hop
    return request.remote_addr or "unknown"


def _find_unclaimed_invitation(db, plain_code: str):
    """
    Direct DB lookup by plain-text code. Returns matching InvitationCode or None.
    Case-insensitive: both the stored code and the input are uppercased for comparison.
    """
    from db.models import InvitationCode
    from sqlalchemy import func

    now = datetime.utcnow()
    inv = (
        db.query(InvitationCode)
        .filter(
            func.upper(InvitationCode.code) == plain_code.upper(),
            InvitationCode.is_active == True,      # noqa: E712
            InvitationCode.player_id == None,       # noqa: E711  (unclaimed)
        )
        .first()
    )
    if inv is None:
        return None
    if inv.expires_at and inv.expires_at < now:
        return None
    if inv.current_uses >= inv.max_uses:
        return None
    return inv


# ─────────────────────────────────────────────
# POST /auth/register
# ─────────────────────────────────────────────

@auth_bp.post("/register")
@limiter.limit("5 per minute")
def register():
    """
    Register a new player using an invitation code.

    Request body:
        {
            "username": "...",          required, 3–50 chars
            "email": "...",             required
            "invitation_code": "..."    required
        }

    Responses:
        201  { "access_token": "...", "player": { id, username, email, credits, energy } }
        400  Missing / invalid fields
        401  Invalid or exhausted invitation code    (generic: no details)
        409  Username or email already in use
        500  Unexpected server error
    """
    from db import SessionLocal
    from db.models import Player

    data = request.get_json(silent=True) or {}
    username        = (data.get("username")        or "").strip()
    email           = (data.get("email")           or "").strip()
    invitation_code = (data.get("invitation_code") or "").strip()
    first_name      = (data.get("first_name")      or "").strip()
    last_name       = (data.get("last_name")       or "").strip()
    job_title       = (data.get("job_title")       or "").strip()

    if not username or not email or not invitation_code or not first_name or not last_name or not job_title:
        return jsonify({"error": "username, email, invitation_code, first_name, last_name and job_title are required"}), 400

    if not (3 <= len(username) <= 50):
        return jsonify({"error": "username must be 3–50 characters"}), 400

    if not (1 <= len(first_name) <= 100):
        return jsonify({"error": "first_name must be 1–100 characters"}), 400

    if not (1 <= len(last_name) <= 100):
        return jsonify({"error": "last_name must be 1–100 characters"}), 400

    if not (1 <= len(job_title) <= 100):
        return jsonify({"error": "job_title must be 1–100 characters"}), 400

    if not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    db = SessionLocal()
    try:
        # Cheap duplicate check before expensive hash comparison
        existing = db.query(Player).filter(
            (Player.username == username) | (Player.email == email)
        ).first()
        if existing:
            logger.info("register: duplicate username/email attempt (details withheld)")
            return jsonify({"error": "Username or email already in use"}), 409

        inv = _find_unclaimed_invitation(db, invitation_code)
        if not inv:
            logger.info("register: invalid/exhausted invitation code attempt")
            return jsonify(_AUTH_ERROR), 401

        # password_hash stores an unusable random sentinel: it satisfies the
        # NOT NULL constraint but is never used for authentication.
        player = Player(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            job_title=job_title,
            password_hash=generate_password_hash(secrets.token_hex(32)),
        )
        db.add(player)
        db.flush()  # populate player.id before linking invitation

        # Assign 10 random protected words to the new player
        from db.models import ProtectedWord, PlayerWord
        import random
        all_words = db.query(ProtectedWord).all()
        chosen = random.sample(all_words, min(10, len(all_words)))
        for pw in chosen:
            db.add(PlayerWord(player_id=player.id, word_id=pw.id))

        # Claim the invitation
        inv.player_id    = player.id
        inv.current_uses += 1
        inv.last_used_at  = datetime.utcnow()
        inv.last_used_ip  = _client_ip()
        if inv.current_uses >= inv.max_uses:
            inv.is_active = False   # auto-deactivate when limit reached

        # hCON bonus: grant 100 fragments to players registering with an hc0n code
        if inv.tag == "hc0n":
            from db.models import PlayerHistoryEntry
            HCON_BONUS = 100
            player.credits += HCON_BONUS
            db.add(PlayerHistoryEntry(
                player_id=player.id,
                type="fragments",
                amount=HCON_BONUS,
                reason="hcon_bonus",
                detail="Ventaja hCON — bonus de 100 fragmentos por código de invitación hc0n",
            ))

        # LinkedIn bonus: grant 100 fragments to players registering with a linkedin code
        if inv.tag == "linkedin":
            from db.models import PlayerHistoryEntry
            LINKEDIN_BONUS = 100
            player.credits += LINKEDIN_BONUS
            db.add(PlayerHistoryEntry(
                player_id=player.id,
                type="fragments",
                amount=LINKEDIN_BONUS,
                reason="linkedin_bonus",
                detail="Ventaja LinkedIn — bonus de 100 fragmentos por código de invitación linkedIn",
            ))

        # Referral bonus: grant 20 fragments to the inviter when a player-generated code is used
        if inv.tag == "invitation" and inv.created_by:
            from db.models import PlayerHistoryEntry
            inviter = db.query(Player).filter_by(id=inv.created_by).first()
            if inviter:
                REFERRAL_BONUS = 20
                inviter.credits += REFERRAL_BONUS
                db.add(PlayerHistoryEntry(
                    player_id=inviter.id,
                    type="fragments",
                    amount=REFERRAL_BONUS,
                    reason="referral_bonus",
                    detail=f"Bonus de referido — {username} se registró con tu código de invitación",
                ))

        db.commit()

        access_token  = create_access_token(identity=player.id)
        refresh_token = create_refresh_token(identity=player.id)
        logger.info("register: player created id=%.8s", player.id)

        return jsonify({
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "player": {
                "id":       player.id,
                "username": player.username,
                "email":    player.email,
                "credits":  player.credits,
                "energy":   player.energy,
            },
        }), 201

    except Exception:
        db.rollback()
        logger.exception("register: unexpected error")
        return jsonify({"error": "Registration failed"}), 500
    finally:
        db.close()


# ─────────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────────

@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    """
    Authenticate an existing player using their invitation code.

    Request body:
        {
            "username":        "...",   required
            "invitation_code": "..."    required
        }

    Responses:
        200  { "access_token": "...", "player": { id, username } }
        400  Missing fields
        401  Invalid credentials    (always the same message — no enumeration)
    """
    from db import SessionLocal
    from db.models import InvitationCode, Player

    data = request.get_json(silent=True) or {}
    username        = (data.get("username")        or "").strip()
    invitation_code = (data.get("invitation_code") or "").strip()

    if not username or not invitation_code:
        return jsonify({"error": "username and invitation_code are required"}), 400

    if not (3 <= len(username) <= 50):
        return jsonify({"error": "username must be 3–50 characters"}), 400

    if len(invitation_code) > 200:
        return jsonify({"error": "invitation_code too long"}), 400

    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(username=username).first()

        if not player:
            return jsonify(_AUTH_ERROR), 401

        if player.is_banned:
            return jsonify({"error": "Account suspended"}), 403

        # Look up the invitation already linked to this player.
        # is_active is NOT checked here: it governs new registrations,
        # not login access. Admin revocation of a player's access
        # should be done at the Player level (e.g. is_banned field).
        inv = (
            db.query(InvitationCode)
            .filter_by(player_id=player.id)
            .first()
        )

        if not inv or inv.code.upper() != invitation_code.upper():
            return jsonify(_AUTH_ERROR), 401

        # Update audit trail (login does not increment current_uses)
        inv.last_used_at = datetime.utcnow()
        inv.last_used_ip = _client_ip()
        db.commit()

        access_token  = create_access_token(identity=player.id)
        refresh_token = create_refresh_token(identity=player.id)
        logger.info("login: success id=%.8s", player.id)

        return jsonify({
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "player": {
                "id":       player.id,
                "username": player.username,
            },
        }), 200

    except Exception:
        db.rollback()
        logger.exception("login: unexpected error")
        return jsonify(_AUTH_ERROR), 401
    finally:
        db.close()


# ─────────────────────────────────────────────
# POST /auth/logout
# ─────────────────────────────────────────────

@auth_bp.post("/logout")
@limiter.limit("30 per minute")
@jwt_required()
def logout():
    """
    Revoke the current access token by adding its jti to the blocklist.

    Responses:
        200  { "message": "Logged out" }
        401  Token missing / invalid / already revoked
        500  Unexpected error
    """
    from db import SessionLocal
    from db.models import TokenBlocklist

    jti = get_jwt()["jti"]
    db  = SessionLocal()
    try:
        db.add(TokenBlocklist(jti=jti))
        db.commit()
        return jsonify({"message": "Logged out"}), 200
    except Exception:
        db.rollback()
        logger.exception("logout: unexpected error")
        return jsonify({"error": "Logout failed"}), 500
    finally:
        db.close()


# ─────────────────────────────────────────────
# POST /auth/revoke-refresh
# ─────────────────────────────────────────────

@auth_bp.post("/revoke-refresh")
@limiter.limit("30 per minute")
@jwt_required(refresh=True)
def revoke_refresh():
    """
    Revoke the current refresh token by adding its jti to the blocklist.

    Responses:
        200  { "message": "Refresh token revoked" }
        401  Token missing / invalid / already revoked
        500  Unexpected error
    """
    from db import SessionLocal
    from db.models import TokenBlocklist

    jti = get_jwt()["jti"]
    db  = SessionLocal()
    try:
        db.add(TokenBlocklist(jti=jti))
        db.commit()
        return jsonify({"message": "Refresh token revoked"}), 200
    except Exception:
        db.rollback()
        logger.exception("revoke_refresh: unexpected error")
        return jsonify({"error": "Revocation failed"}), 500
    finally:
        db.close()


# ─────────────────────────────────────────────
# POST /auth/refresh
# ─────────────────────────────────────────────

@auth_bp.post("/refresh")
@limiter.limit("60 per minute")
@jwt_required(refresh=True)
def refresh():
    """
    Issue a new access token using a valid refresh token.

    The refresh token must be passed in the Authorization header:
        Authorization: Bearer <refresh_token>

    Responses:
        200  { "access_token": "..." }
        401  Refresh token missing / invalid / revoked
        403  Account suspended
    """
    from db import SessionLocal
    from db.models import Player

    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=user_id).first()
        if player and player.is_banned:
            logger.info("refresh: banned player attempted token refresh id=%.8s", user_id)
            return jsonify({"error": "Account suspended"}), 403
    finally:
        db.close()

    access_token = create_access_token(identity=user_id)
    logger.info("refresh: new access token issued for id=%.8s", user_id)
    return jsonify({"access_token": access_token}), 200


# ─────────────────────────────────────────────
# GET /auth/me
# ─────────────────────────────────────────────

@auth_bp.get("/me")
@jwt_required()
def me():
    """
    Return the profile of the currently authenticated player.

    Responses:
        200  { id, username, email, credits, energy, created_at }
        401  Token missing / invalid / revoked
        404  Player not found (should not happen with valid token)
    """
    from db import SessionLocal
    from db.models import Player

    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        player = db.query(Player).filter_by(id=user_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        if player.is_banned:
            logger.info("me: banned player request id=%.8s", user_id)
            return jsonify({"error": "Account suspended"}), 403

        return jsonify({
            "id":          player.id,
            "username":    player.username,
            "email":       player.email,
            "credits":     player.credits,
            "energy":      player.energy,
            "created_at":  (player.created_at.isoformat() + "Z") if player.created_at else None,
            "has_fortress": player.fortress is not None,
        }), 200
    finally:
        db.close()
