"""
Admin prize management endpoints.

All endpoints require X-Admin-Secret header.

GET    /api/v1/admin/prizes           List all prizes
POST   /api/v1/admin/prizes           Create a prize
PUT    /api/v1/admin/prizes/<id>      Update a prize (including the winner)
DELETE /api/v1/admin/prizes/<id>      Delete a prize

The winner is a player (winner_username) or a team (winner_team_id), never both
(docs/specs/teams.md RN-90). Setting one clears the other.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime

from db import SessionLocal
from db.models import Prize, Team
from routes.admin import _check_admin

admin_prizes_bp = Blueprint("admin_prizes", __name__)


def _prize_to_dict(prize: Prize) -> dict:
    return {
        "id":               prize.id,
        "sort_order":       prize.sort_order,
        "name":             prize.name,
        "tagline":          prize.tagline,
        "description":      prize.description,
        "icon":             prize.icon,
        "category":         prize.category,
        "color_key":        prize.color_key,
        "winner_username":  prize.winner_username,
        "winner_team_id":   prize.winner_team_id,
        "winner_team":      {"id": prize.winner_team.id, "name": prize.winner_team.name} if prize.winner_team else None,
        "updated_at":       prize.updated_at.isoformat() if prize.updated_at else None,
    }


def _apply_winner(db, prize: Prize, data: dict):
    """
    Apply winner_username / winner_team_id from `data` (RN-90).
    Returns an error response, or None when the winner was applied.
    """
    has_user = "winner_username" in data
    has_team = "winner_team_id" in data
    username = (data.get("winner_username") or "").strip() or None if has_user else prize.winner_username
    team_id = (data.get("winner_team_id") or "").strip() or None if has_team else prize.winner_team_id

    if has_user and has_team and username and team_id:
        return jsonify({"error": "A prize has one winner: a player or a team", "code": "two_winners"}), 400
    if has_team and team_id and db.get(Team, team_id) is None:
        return jsonify({"error": "Team not found", "code": "team_not_found"}), 404

    if has_team and team_id:
        username = None      # a team winner replaces a player winner
    elif has_user and username:
        team_id = None       # and the other way round
    prize.winner_username = username
    prize.winner_team_id = team_id
    return None


# ──────────────────────────────────────────────────────────
# GET /prizes
# ──────────────────────────────────────────────────────────

@admin_prizes_bp.get("/prizes")
def list_prizes():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403
    db = SessionLocal()
    try:
        prizes = db.query(Prize).order_by(Prize.sort_order.asc()).all()
        return jsonify([_prize_to_dict(p) for p in prizes]), 200
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /prizes
# ──────────────────────────────────────────────────────────

@admin_prizes_bp.post("/prizes")
def create_prize():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    from db.models import generate_uuid
    prize = Prize(
        id=generate_uuid(),
        sort_order=int(data.get("sort_order") or 0),
        name=name,
        tagline=(data.get("tagline") or "").strip() or None,
        description=(data.get("description") or "").strip() or None,
        icon=(data.get("icon") or "star").strip(),
        category=(data.get("category") or "").strip() or None,
        color_key=(data.get("color_key") or "cyan").strip(),
    )

    db = SessionLocal()
    try:
        if (error := _apply_winner(db, prize, data)) is not None:
            return error
        db.add(prize)
        db.commit()
        db.refresh(prize)
        return jsonify(_prize_to_dict(prize)), 201
    except Exception as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /prizes/<id>
# ──────────────────────────────────────────────────────────

@admin_prizes_bp.put("/prizes/<prize_id>")
def update_prize(prize_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        prize = db.get(Prize, prize_id)
        if not prize:
            return jsonify({"error": "Prize not found"}), 404

        data = request.get_json(silent=True) or {}

        if "sort_order" in data:
            prize.sort_order = int(data["sort_order"])
        if "name" in data:
            prize.name = (data["name"] or "").strip()
        if "tagline" in data:
            prize.tagline = (data["tagline"] or "").strip() or None
        if "description" in data:
            prize.description = (data["description"] or "").strip() or None
        if "icon" in data:
            prize.icon = (data["icon"] or "star").strip()
        if "category" in data:
            prize.category = (data["category"] or "").strip() or None
        if "color_key" in data:
            prize.color_key = (data["color_key"] or "cyan").strip()
        if (error := _apply_winner(db, prize, data)) is not None:
            db.rollback()
            return error

        prize.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(prize)
        return jsonify(_prize_to_dict(prize)), 200
    except Exception as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /prizes/<id>
# ──────────────────────────────────────────────────────────

@admin_prizes_bp.delete("/prizes/<prize_id>")
def delete_prize(prize_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        prize = db.get(Prize, prize_id)
        if not prize:
            return jsonify({"error": "Prize not found"}), 404
        db.delete(prize)
        db.commit()
        return jsonify({"ok": True}), 200
    except Exception as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        db.close()
