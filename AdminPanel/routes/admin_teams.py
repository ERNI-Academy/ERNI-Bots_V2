"""
Admin team management (docs/specs/teams.md §9). All endpoints require X-Admin-Secret.

GET    /teams?status=active|dissolved|all&q=        list teams
POST   /teams                                       create   {name, member_ids?}
GET    /teams/available-players?q=&limit=           players without team (not bots)
GET    /teams/<id>                                  detail: members, season points, log
PATCH  /teams/<id>                                  rename   {name}
POST   /teams/<id>/regenerate-code                  new join code
POST   /teams/<id>/members                          add      {player_id}
DELETE /teams/<id>/members/<player_id>              remove
POST   /teams/<id>/members/<player_id>/move         move     {target_team_id}
POST   /teams/<id>/dissolve                         dissolve one team
POST   /teams/dissolve-all                          dissolve every team {confirm: "DISOLVER"}

Errors: {"error": "<message>", "code": "<code>"}.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from db.models import Player, Season, Team, TeamMembershipLog, TeamSeasonMember
from routes.admin import _check_admin
from services.team_admin import (
    admin_add_member,
    admin_create_team,
    admin_dissolve_all,
    admin_dissolve_team,
    admin_move_member,
    admin_regenerate_code,
    admin_remove_member,
    admin_rename_team,
    get_team,
)
from services.teams import TeamError, get_team_settings, is_team_season

admin_teams_bp = Blueprint("admin_teams", __name__)

_LOG_LIMIT = 100


def _iso(value):
    return value.isoformat() + "Z" if value else None


def _forbidden():
    return jsonify({"error": "Forbidden"}), 403


def _counts(db, team_ids):
    if not team_ids:
        return {}
    return dict(
        db.query(Player.team_id, func.count(Player.id))
        .filter(Player.team_id.in_(team_ids))
        .group_by(Player.team_id)
        .all()
    )


def _season_scores(db, season_id, team_ids):
    if not season_id or not team_ids:
        return {}
    return dict(
        db.query(TeamSeasonMember.team_id, func.coalesce(func.sum(TeamSeasonMember.score), 0))
        .filter(TeamSeasonMember.season_id == season_id, TeamSeasonMember.team_id.in_(team_ids))
        .group_by(TeamSeasonMember.team_id)
        .all()
    )


def _team_summary(team, count, max_size, score) -> dict:
    return {
        "id": team.id,
        "name": team.name,
        "join_code": team.join_code,
        "member_count": count,
        "max_size": max_size,
        "over_max": count > max_size,
        "created_at": _iso(team.created_at),
        "created_by_admin": team.created_by_player_id is None,
        "dissolved_at": _iso(team.dissolved_at),
        "dissolved_reason": team.dissolved_reason,
        "score_active_season": int(score) if score is not None else None,
    }


def _team_detail(db, team) -> dict:
    max_size = get_team_settings(db)["team_max_size"]
    active = db.query(Season).filter_by(is_active=True).first()
    count = _counts(db, [team.id]).get(team.id, 0)
    score = _season_scores(db, active.id, [team.id]).get(team.id, 0) if active else None
    body = _team_summary(team, count, max_size, score)

    joined = dict(
        db.query(TeamMembershipLog.player_id, func.max(TeamMembershipLog.created_at))
        .filter(TeamMembershipLog.team_id == team.id, TeamMembershipLog.event.in_(("joined", "moved_in")))
        .group_by(TeamMembershipLog.player_id)
        .all()
    )
    members = db.query(Player).filter(Player.team_id == team.id).order_by(Player.username).all()
    body["members"] = [
        {
            "id": p.id,
            "username": p.username,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "is_banned": p.is_banned,
            "joined_at": _iso(joined.get(p.id)),
        }
        for p in members
    ]

    season_rows = (
        db.query(Season, func.coalesce(func.sum(TeamSeasonMember.score), 0), func.count(TeamSeasonMember.id))
        .join(TeamSeasonMember, TeamSeasonMember.season_id == Season.id)
        .filter(TeamSeasonMember.team_id == team.id)
        .group_by(Season.id)
        .order_by(Season.start_date.desc())
        .all()
    )
    body["seasons"] = [
        {
            "season_id": s.id,
            "name": s.name,
            "is_active": s.is_active,
            "finalized": s.finalized,
            "score": int(score),
            "roster_size": roster_size,
        }
        for s, score, roster_size in season_rows
    ]

    names = {}
    log_rows = (
        db.query(TeamMembershipLog)
        .filter(TeamMembershipLog.team_id == team.id)
        .order_by(TeamMembershipLog.created_at.desc())
        .limit(_LOG_LIMIT)
        .all()
    )
    player_ids = {r.player_id for r in log_rows if r.player_id} | {r.actor_player_id for r in log_rows if r.actor_player_id}
    if player_ids:
        names = dict(db.query(Player.id, Player.username).filter(Player.id.in_(player_ids)).all())
    body["log"] = [
        {
            "event": r.event,
            "actor": r.actor,
            "player": names.get(r.player_id),
            "actor_player": names.get(r.actor_player_id),
            "detail": r.detail,
            "created_at": _iso(r.created_at),
        }
        for r in log_rows
    ]
    body["team_season_running"] = is_team_season(active)
    return body


def _mutate(operation, success_status=200):
    """Run an admin operation in one transaction and return the team detail."""
    db = SessionLocal()
    try:
        try:
            team = operation(db)
            db.commit()
        except TeamError as exc:
            db.rollback()
            return jsonify({"error": exc.message, "code": exc.code}), exc.status
        except IntegrityError:
            db.rollback()
            return jsonify({"error": "Ya existe un equipo con ese nombre", "code": "name_taken"}), 409
        db.refresh(team)
        return jsonify(_team_detail(db, team)), success_status
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _body():
    return request.get_json(silent=True) or {}


# ──────────────────────────────────────────────────────────
# Read
# ──────────────────────────────────────────────────────────

@admin_teams_bp.get("/teams")
def list_teams():
    if not _check_admin():
        return _forbidden()

    status = request.args.get("status", "active")
    if status not in ("active", "dissolved", "all"):
        return jsonify({"error": "status must be active, dissolved or all", "code": "invalid_status"}), 400
    q = (request.args.get("q") or "").strip()

    db = SessionLocal()
    try:
        query = db.query(Team)
        if status == "active":
            query = query.filter(Team.dissolved_at.is_(None))
        elif status == "dissolved":
            query = query.filter(Team.dissolved_at.isnot(None))
        if q:
            query = query.filter(or_(Team.name.ilike(f"%{q}%"), Team.join_code.ilike(f"%{q}%")))
        teams = query.order_by(Team.name).all()

        ids = [t.id for t in teams]
        counts = _counts(db, ids)
        active = db.query(Season).filter_by(is_active=True).first()
        scores = _season_scores(db, active.id, ids) if active else {}
        max_size = get_team_settings(db)["team_max_size"]
        return jsonify([
            _team_summary(t, counts.get(t.id, 0), max_size, scores.get(t.id, 0) if active else None)
            for t in teams
        ]), 200
    finally:
        db.close()


@admin_teams_bp.get("/teams/available-players")
def available_players():
    """Players that can be added to a team: no team, not bots."""
    if not _check_admin():
        return _forbidden()
    q = (request.args.get("q") or "").strip()
    try:
        limit = min(50, max(1, int(request.args.get("limit", 20))))
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    db = SessionLocal()
    try:
        query = db.query(Player).filter(Player.team_id.is_(None), Player.is_bot == False)  # noqa: E712
        if q:
            pattern = f"%{q}%"
            query = query.filter(or_(
                Player.username.ilike(pattern),
                Player.first_name.ilike(pattern),
                Player.last_name.ilike(pattern),
            ))
        players = query.order_by(Player.username).limit(limit).all()
        return jsonify([
            {
                "id": p.id,
                "username": p.username,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "is_banned": p.is_banned,
            }
            for p in players
        ]), 200
    finally:
        db.close()


@admin_teams_bp.get("/teams/<team_id>")
def team_detail(team_id):
    if not _check_admin():
        return _forbidden()
    db = SessionLocal()
    try:
        try:
            team = get_team(db, team_id, active=False)
        except TeamError as exc:
            return jsonify({"error": exc.message, "code": exc.code}), exc.status
        return jsonify(_team_detail(db, team)), 200
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# Write
# ──────────────────────────────────────────────────────────

@admin_teams_bp.post("/teams")
def create_team():
    if not _check_admin():
        return _forbidden()
    data = _body()
    member_ids = data.get("member_ids") or []
    if not isinstance(member_ids, list) or not all(isinstance(i, str) for i in member_ids):
        return jsonify({"error": "member_ids must be a list of player ids", "code": "invalid_members"}), 400
    return _mutate(lambda db: admin_create_team(db, data.get("name"), member_ids), success_status=201)


@admin_teams_bp.patch("/teams/<team_id>")
def rename_team(team_id):
    if not _check_admin():
        return _forbidden()
    name = _body().get("name")
    return _mutate(lambda db: admin_rename_team(db, team_id, name))


@admin_teams_bp.post("/teams/<team_id>/regenerate-code")
def regenerate_code(team_id):
    if not _check_admin():
        return _forbidden()
    return _mutate(lambda db: admin_regenerate_code(db, team_id))


@admin_teams_bp.post("/teams/<team_id>/members")
def add_member(team_id):
    if not _check_admin():
        return _forbidden()
    player_id = _body().get("player_id")
    if not isinstance(player_id, str) or not player_id:
        return jsonify({"error": "player_id is required", "code": "invalid_player"}), 400
    return _mutate(lambda db: admin_add_member(db, team_id, player_id))


@admin_teams_bp.delete("/teams/<team_id>/members/<player_id>")
def remove_member(team_id, player_id):
    if not _check_admin():
        return _forbidden()
    return _mutate(lambda db: admin_remove_member(db, team_id, player_id))


@admin_teams_bp.post("/teams/<team_id>/members/<player_id>/move")
def move_member(team_id, player_id):
    if not _check_admin():
        return _forbidden()
    target_team_id = _body().get("target_team_id")
    return _mutate(lambda db: admin_move_member(db, team_id, player_id, target_team_id))


@admin_teams_bp.post("/teams/<team_id>/dissolve")
def dissolve_team(team_id):
    if not _check_admin():
        return _forbidden()
    return _mutate(lambda db: admin_dissolve_team(db, team_id))


@admin_teams_bp.post("/teams/dissolve-all")
def dissolve_all():
    if not _check_admin():
        return _forbidden()
    confirmation = _body().get("confirm")
    db = SessionLocal()
    try:
        try:
            dissolved = admin_dissolve_all(db, confirmation)
            db.commit()
        except TeamError as exc:
            db.rollback()
            return jsonify({"error": exc.message, "code": exc.code}), exc.status
        return jsonify({"dissolved": dissolved}), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
