"""
GET /api/v1/prizes  – public, no auth required.
Returns all prizes ordered by sort_order, including winner if set.
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
    }


@prizes_bp.get("/")
def list_prizes():
    """Return all prizes ordered by sort_order."""
    db = SessionLocal()
    try:
        prizes = db.query(Prize).order_by(Prize.sort_order.asc()).all()
        return jsonify([_prize_to_dict(p) for p in prizes]), 200
    finally:
        db.close()
