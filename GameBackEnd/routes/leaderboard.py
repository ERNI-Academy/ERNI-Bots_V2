from flask import Blueprint, jsonify, request
from db import SessionLocal
from db.models import Player, PlayerSeasonStats, Season

leaderboard_bp = Blueprint("leaderboard", __name__)

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def get_active_season(db):
    return db.query(Season).filter_by(is_active=True).first()


def get_ranked_season(db):
    """Return the season marked as is_ranked, falling back to the active season."""
    ranked = db.query(Season).filter_by(is_ranked=True).first()
    if ranked:
        return ranked
    return get_active_season(db)

@leaderboard_bp.get("")
def leaderboard():
    try:
        offset = max(0, int(request.args.get("offset", 0)))
        limit  = min(MAX_LIMIT, max(1, int(request.args.get("limit", DEFAULT_LIMIT))))
    except (TypeError, ValueError):
        return jsonify({"error": "offset and limit must be integers"}), 400

    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    base_query = (
        db.query(PlayerSeasonStats, Player)
        .join(Player, Player.id == PlayerSeasonStats.player_id)
        .filter(
            PlayerSeasonStats.season_id == season.id,
            Player.is_bot == False,   # noqa: E712
        )
        .order_by(PlayerSeasonStats.score.desc())
    )

    total = base_query.count()

    rows = base_query.offset(offset).limit(limit).all()

    items = []
    for i, (stats, player) in enumerate(rows):
        items.append({
            "rank": offset + i + 1,
            "username": player.username,
            "score": stats.score
        })

    db.close()
    return jsonify({
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total
    })
