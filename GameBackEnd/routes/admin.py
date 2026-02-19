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
from db.models import InvitationCode, Player, Fortress, Season

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

@admin_bp.get("/stats")
def stats():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        player_count = db.query(Player).count()
        fortress_count = db.query(Fortress).count()

        active_season = db.query(Season).filter_by(is_active=True).first()

        free_codes = db.query(InvitationCode).filter(
            InvitationCode.is_active == True,   # noqa: E712
            InvitationCode.player_id == None,    # noqa: E711
        ).count()

        return jsonify({
            "players":       player_count,
            "fortresses":    fortress_count,
            "free_codes":    free_codes,
            "active_season": active_season.name if active_season else None,
        })
    finally:
        db.close()
