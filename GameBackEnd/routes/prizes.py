"""
GET /api/v1/prizes  – public, no auth required.
Returns all prizes ordered by sort_order, including winner if set.
The winner is either a player (winner_username) or a team (winner_team, shown
with its current members, D19).
"""

from flask import Blueprint, jsonify
from db import SessionLocal
from db.models import Prize

prizes_bp = Blueprint("prizes", __name__)


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
        "winner_team":      _team_to_dict(prize.winner_team) if prize.winner_team else None,
    }


def _team_to_dict(team) -> dict:
    members = sorted(
        player.username for player in team.members if not player.is_banned
    )
    return {"name": team.name, "members": members}


@prizes_bp.get("/")
def list_prizes():
    """Return all prizes ordered by sort_order."""
    db = SessionLocal()
    try:
        prizes = db.query(Prize).order_by(Prize.sort_order.asc()).all()
        return jsonify([_prize_to_dict(p) for p in prizes]), 200
    finally:
        db.close()
