"""
GET /api/v1/leaderboard                    – public ranking of the active season
      ?type=players|teams                    default: teams in team seasons, players otherwise
      ?offset=&limit=
GET /api/v1/leaderboard/teams/<team_id>    – team detail: roster and contributed points
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from db import SessionLocal
from db.models import Player, PlayerSeasonStats, Season, Team, TeamSeasonMember
from services.teams import is_team_season

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


def _page(total, offset, limit, items):
    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total,
    }


def _player_ranking(db, season, offset, limit, team_mode):
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
        item = {
            "rank": offset + i + 1,
            "username": player.username,
            "score": stats.score,
        }
        if team_mode:
            item["team_name"] = player.team.name if player.team else None
        items.append(item)
    return _page(total, offset, limit, items)


def _team_ranking(db, season, offset, limit):
    """RN-80/81: teams with roster rows in the season, dissolved ones included."""
    score = func.coalesce(func.sum(TeamSeasonMember.score), 0).label("score")
    base_query = (
        db.query(Team, score)
        .join(TeamSeasonMember, TeamSeasonMember.team_id == Team.id)
        .filter(TeamSeasonMember.season_id == season.id)
        .group_by(Team.id)
        .order_by(score.desc(), Team.name.asc())
    )
    total = base_query.count()
    rows = base_query.offset(offset).limit(limit).all()

    team_ids = [team.id for team, _ in rows]
    counts = dict(
        db.query(Player.team_id, func.count(Player.id))
        .filter(Player.team_id.in_(team_ids))
        .group_by(Player.team_id)
        .all()
    ) if team_ids else {}

    items = [
        {
            "rank": offset + i + 1,
            "team_id": team.id,
            "name": team.name,
            "score": int(team_score),
            "member_count": counts.get(team.id, 0),
            "dissolved": team.dissolved_at is not None,
        }
        for i, (team, team_score) in enumerate(rows)
    ]
    return _page(total, offset, limit, items)


@leaderboard_bp.get("")
def leaderboard():
    try:
        offset = max(0, int(request.args.get("offset", 0)))
        limit  = min(MAX_LIMIT, max(1, int(request.args.get("limit", DEFAULT_LIMIT))))
    except (TypeError, ValueError):
        return jsonify({"error": "offset and limit must be integers"}), 400

    db = SessionLocal()
    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400

        team_mode = is_team_season(season)
        ranking_type = request.args.get("type") or ("teams" if team_mode else "players")
        if ranking_type not in ("players", "teams"):
            return jsonify({"error": "type must be 'players' or 'teams'", "code": "invalid_type"}), 400

        if ranking_type == "teams":
            if not team_mode:
                return jsonify({"error": "The active season is not a team season", "code": "not_team_season"}), 400
            body = _team_ranking(db, season, offset, limit)
        else:
            body = _player_ranking(db, season, offset, limit, team_mode)

        body["type"] = ranking_type
        body["season_mode"] = season.mode
        return jsonify(body)
    finally:
        db.close()


@leaderboard_bp.get("/teams/<team_id>")
def team_detail(team_id):
    """A team in the active team season: roster with each member's contribution."""
    db = SessionLocal()
    try:
        season = get_active_season(db)
        if not season:
            return jsonify({"error": "No active season"}), 400
        if not is_team_season(season):
            return jsonify({"error": "The active season is not a team season", "code": "not_team_season"}), 400

        team = db.get(Team, team_id)
        rows = (
            db.query(TeamSeasonMember, Player)
            .join(Player, Player.id == TeamSeasonMember.player_id)
            .filter(TeamSeasonMember.team_id == team_id, TeamSeasonMember.season_id == season.id)
            .order_by(TeamSeasonMember.score.desc(), Player.username.asc())
            .all()
        ) if team else []
        if not rows:
            return jsonify({"error": "Team not found in this season", "code": "team_not_found"}), 404

        return jsonify({
            "team_id": team.id,
            "name": team.name,
            "dissolved": team.dissolved_at is not None,
            "score": sum(member.score for member, _ in rows),
            "members": [
                {
                    "username": player.username,
                    "score": member.score,
                    "current_member": player.team_id == team.id,
                }
                for member, player in rows
            ],
        })
    finally:
        db.close()
