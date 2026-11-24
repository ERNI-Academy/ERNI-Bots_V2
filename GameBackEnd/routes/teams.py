"""
Team endpoints for players (docs/specs/teams.md §8). All require a JWT.

GET    /api/v1/teams/me                    – my team (or null) and what I may do
POST   /api/v1/teams                       – create a team            {name}
GET    /api/v1/teams/preview?code=         – team behind a join code (before joining)
POST   /api/v1/teams/join                  – join with a code         {code}
POST   /api/v1/teams/me/leave              – leave my team
PATCH  /api/v1/teams/me                    – rename my team           {name}
POST   /api/v1/teams/me/regenerate-code    – new join code for my team

Errors: {"error": "<message>", "code": "<code>"} with the status of the rule.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from db.models import Player, TeamMembershipLog
from extensions import limiter, player_or_ip_key
from services.teams import (
    TeamError,
    create_team,
    get_active_team_by_code,
    get_running_team_season,
    get_team_settings,
    join_team,
    leave_team,
    member_count,
    regenerate_join_code,
    rename_team,
)

teams_bp = Blueprint("teams", __name__)

# RN-23: code guessing is limited per player, shared by preview and join.
_code_attempts_limit = limiter.shared_limit("10 per minute", scope="team-code", key_func=player_or_ip_key)


def _error_response(exc: TeamError):
    return jsonify({"error": exc.message, "code": exc.code}), exc.status


def _name_taken_response():
    return jsonify({"error": "Ya existe un equipo con ese nombre", "code": "name_taken"}), 409


def _joined_at_by_player(db, team_id):
    rows = (
        db.query(TeamMembershipLog.player_id, func.max(TeamMembershipLog.created_at))
        .filter(
            TeamMembershipLog.team_id == team_id,
            TeamMembershipLog.event.in_(("joined", "moved_in")),
        )
        .group_by(TeamMembershipLog.player_id)
        .all()
    )
    return dict(rows)


def _team_state(db, player) -> dict:
    """My team plus the actions currently allowed, so the UI never guesses the rules."""
    settings = get_team_settings(db)
    running = get_running_team_season(db) is not None
    team = player.team

    body = {
        "team": None,
        "max_size": settings["team_max_size"],
        "team_season_running": running,
        "can_create": team is None and not player.is_bot and settings["team_creation_enabled"],
        "can_join": team is None and not player.is_bot and settings["team_joining_enabled"],
        "can_manage": team is not None and settings["team_self_management_enabled"],
        "can_leave": team is not None and settings["team_leaving_enabled"] and not running,
        "leave_blocked_reason": None,
    }
    if team is None:
        return body

    if not body["can_leave"]:
        body["leave_blocked_reason"] = "season_locked" if running else "team_leaving_disabled"

    members = sorted(team.members, key=lambda p: p.username.lower())
    joined_at = _joined_at_by_player(db, team.id)
    body["team"] = {
        "id": team.id,
        "name": team.name,
        "join_code": team.join_code,
        "member_count": len(members),
        "is_full": len(members) >= settings["team_max_size"],
        "members": [
            {
                "username": member.username,
                "first_name": member.first_name,
                "last_name": member.last_name,
                "joined_at": joined_at[member.id].isoformat() if joined_at.get(member.id) else None,
            }
            for member in members
        ],
    }
    return body


def _current_player(db):
    return db.query(Player).filter_by(id=get_jwt_identity()).first()


def _run(operation, success_status=200):
    """Run a team operation for the current player in one transaction and return the new state."""
    db = SessionLocal()
    try:
        player = _current_player(db)
        if not player:
            return jsonify({"error": "Player not found"}), 404
        try:
            operation(db, player)
            db.commit()
        except TeamError as exc:
            db.rollback()
            return _error_response(exc)
        except IntegrityError:
            # Unique indexes on active team names / codes: lost a race with another request
            db.rollback()
            return _name_taken_response()
        db.refresh(player)
        return jsonify(_team_state(db, player)), success_status
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@teams_bp.get("/me")
@jwt_required()
def my_team():
    db = SessionLocal()
    try:
        player = _current_player(db)
        if not player:
            return jsonify({"error": "Player not found"}), 404
        return jsonify(_team_state(db, player)), 200
    finally:
        db.close()


@teams_bp.post("")
@jwt_required()
def create():
    name = (request.get_json(silent=True) or {}).get("name")
    return _run(lambda db, player: create_team(db, player, name), success_status=201)


@teams_bp.get("/preview")
@jwt_required()
@_code_attempts_limit
def preview():
    db = SessionLocal()
    try:
        team = get_active_team_by_code(db, request.args.get("code"))
        if team is None:
            return jsonify({"error": "Código de equipo no válido", "code": "invalid_code"}), 404
        max_size = get_team_settings(db)["team_max_size"]
        count = member_count(db, team.id)
        return jsonify({
            "name": team.name,
            "member_count": count,
            "max_size": max_size,
            "is_full": count >= max_size,
        }), 200
    finally:
        db.close()


@teams_bp.post("/join")
@jwt_required()
@_code_attempts_limit
def join():
    code = (request.get_json(silent=True) or {}).get("code")
    return _run(lambda db, player: join_team(db, player, code))


@teams_bp.post("/me/leave")
@jwt_required()
def leave():
    return _run(leave_team)


@teams_bp.patch("/me")
@jwt_required()
def rename():
    name = (request.get_json(silent=True) or {}).get("name")
    return _run(lambda db, player: rename_team(db, player, name))


@teams_bp.post("/me/regenerate-code")
@jwt_required()
def regenerate_code():
    return _run(regenerate_join_code)
