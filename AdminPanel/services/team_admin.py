"""
Admin-only team operations (docs/specs/teams.md RN-50..55, RN-62..64).

The admin is not bound by the team toggles nor by the team-season lock, but
does respect RN-01 (one team per player), RN-04 (no bots) and the maximum
team size (D16). Every change is written to team_membership_log with
actor='admin' (RN-55).

Callers own the transaction: these functions flush but never commit.
"""

from __future__ import annotations

from datetime import datetime

from services.teams import (
    TeamError,
    clean_name,
    dissolve_if_empty,
    ensure_team_season_member,
    generate_unique_join_code,
    get_running_team_season,
    get_team_settings,
    is_team_season,
    log_team_event,
    member_count,
    normalize_name,
)

DISSOLVE_ALL_CONFIRMATION = "DISOLVER"

_ERRORS = {
    "team_not_found": ("Equipo no encontrado", 404),
    "player_not_found": ("Jugador no encontrado", 404),
    "team_dissolved": ("El equipo está disuelto", 409),
    "already_in_team": ("El jugador ya pertenece a un equipo; usa «mover»", 409),
    "not_in_team": ("El jugador no pertenece a este equipo", 409),
    "bots_cannot_join": ("Los bots no pueden pertenecer a equipos", 409),
    "team_full": ("El equipo está completo", 409),
    "name_taken": ("Ya existe un equipo con ese nombre", 409),
    "same_team": ("El jugador ya está en ese equipo", 409),
    "season_locked": ("No se pueden disolver todos los equipos durante una temporada por equipos", 409),
    "confirmation_required": (f"Escribe {DISSOLVE_ALL_CONFIRMATION} para confirmar", 400),
}


def _error(code: str) -> TeamError:
    message, status = _ERRORS[code]
    return TeamError(code, message, status)


# ──────────────────────────────────────────────────────────
# Lookups
# ──────────────────────────────────────────────────────────

def get_team(db, team_id: str, lock: bool = False, active: bool = True):
    from db.models import Team

    query = db.query(Team).filter(Team.id == team_id)
    if lock:
        query = query.with_for_update()
    team = query.first()
    if team is None:
        raise _error("team_not_found")
    if active and team.dissolved_at is not None:
        raise _error("team_dissolved")
    return team


def _get_player(db, player_id: str):
    from db.models import Player

    player = db.query(Player).filter(Player.id == player_id).with_for_update().first()
    if player is None:
        raise _error("player_not_found")
    return player


def _ensure_name_free(db, name: str, exclude_team_id: str | None = None) -> str:
    from db.models import Team

    normalized = normalize_name(name)
    query = db.query(Team.id).filter(Team.name_normalized == normalized, Team.dissolved_at.is_(None))
    if exclude_team_id:
        query = query.filter(Team.id != exclude_team_id)
    if query.first() is not None:
        raise _error("name_taken")
    return normalized


def _ensure_room(db, team, extra: int = 1) -> None:
    if member_count(db, team.id) + extra > get_team_settings(db)["team_max_size"]:
        raise _error("team_full")


def _put_in_team(db, player, team, event: str) -> None:
    player.team_id = team.id
    log_team_event(db, team.id, event, "admin", player_id=player.id)
    season = get_running_team_season(db)
    if season:
        ensure_team_season_member(db, team.id, season.id, player.id)


# ──────────────────────────────────────────────────────────
# Operations
# ──────────────────────────────────────────────────────────

def admin_create_team(db, raw_name: str | None, member_ids=None):
    from db.models import Team

    name = clean_name(raw_name)
    normalized = _ensure_name_free(db, name)

    member_ids = list(dict.fromkeys(member_ids or []))  # de-duplicated, order kept
    if len(member_ids) > get_team_settings(db)["team_max_size"]:
        raise _error("team_full")
    members = [_get_player(db, player_id) for player_id in member_ids]
    for player in members:
        if player.is_bot:
            raise _error("bots_cannot_join")
        if player.team_id:
            raise _error("already_in_team")

    team = Team(name=name, name_normalized=normalized, join_code=generate_unique_join_code(db))
    db.add(team)
    db.flush()
    log_team_event(db, team.id, "created", "admin")
    for player in members:
        _put_in_team(db, player, team, "joined")
    db.flush()
    return team


def admin_rename_team(db, team_id: str, raw_name: str | None):
    team = get_team(db, team_id, lock=True)
    name = clean_name(raw_name)
    if name != team.name:
        team.name_normalized = _ensure_name_free(db, name, exclude_team_id=team.id)
        log_team_event(db, team.id, "renamed", "admin", detail=team.name)
        team.name = name
        db.flush()
    return team


def admin_regenerate_code(db, team_id: str):
    team = get_team(db, team_id, lock=True)
    team.join_code = generate_unique_join_code(db)
    log_team_event(db, team.id, "code_regenerated", "admin")
    db.flush()
    return team


def admin_add_member(db, team_id: str, player_id: str):
    team = get_team(db, team_id, lock=True)
    player = _get_player(db, player_id)
    if player.is_bot:
        raise _error("bots_cannot_join")
    if player.team_id:
        raise _error("already_in_team")
    _ensure_room(db, team)
    _put_in_team(db, player, team, "joined")
    db.flush()
    return team


def admin_remove_member(db, team_id: str, player_id: str):
    team = get_team(db, team_id, lock=True)
    player = _get_player(db, player_id)
    if player.team_id != team.id:
        raise _error("not_in_team")
    player.team_id = None
    log_team_event(db, team.id, "removed", "admin", player_id=player.id)
    db.flush()
    dissolve_if_empty(db, team)
    db.flush()
    return team


def admin_move_member(db, team_id: str, player_id: str, target_team_id: str | None):
    """RN-52: points already earned stay with the source team; new ones go to the target."""
    source = get_team(db, team_id, lock=True)
    if not target_team_id:
        raise _error("team_not_found")
    if target_team_id == source.id:
        raise _error("same_team")
    target = get_team(db, target_team_id, lock=True)
    player = _get_player(db, player_id)
    if player.team_id != source.id:
        raise _error("not_in_team")
    _ensure_room(db, target)

    log_team_event(db, source.id, "moved_out", "admin", player_id=player.id, detail=target.name)
    _put_in_team(db, player, target, "moved_in")
    db.flush()
    dissolve_if_empty(db, source)
    db.flush()
    return target


def admin_dissolve_team(db, team_id: str, reason: str = "admin"):
    """RN-53: members are left without team; history and season points are kept."""
    from db.models import Player

    team = get_team(db, team_id, lock=True)
    for player in db.query(Player).filter(Player.team_id == team.id).with_for_update().all():
        player.team_id = None
        log_team_event(db, team.id, "removed", "admin", player_id=player.id, detail="team_dissolved")
    team.dissolved_at = datetime.utcnow()
    team.dissolved_reason = reason
    log_team_event(db, team.id, "dissolved", "admin", detail=reason)
    db.flush()
    return team


def admin_dissolve_all(db, confirmation: str | None) -> int:
    """RN-54: only outside a running team season, and with a typed confirmation."""
    from db.models import Team

    if (confirmation or "").strip() != DISSOLVE_ALL_CONFIRMATION:
        raise _error("confirmation_required")
    if get_running_team_season(db):
        raise _error("season_locked")
    team_ids = [row[0] for row in db.query(Team.id).filter(Team.dissolved_at.is_(None)).all()]
    for team_id in team_ids:
        admin_dissolve_team(db, team_id, reason="admin_bulk")
    return len(team_ids)


# ──────────────────────────────────────────────────────────
# Seasons
# ──────────────────────────────────────────────────────────

def snapshot_team_rosters(db, season) -> int:
    """
    RN-62/63: when a team season is (re)activated, every current member of every
    active team gets a roster row (score 0). Existing rows are kept.
    """
    from db.models import Player, Team

    if not is_team_season(season):
        return 0
    members = (
        db.query(Player.id, Player.team_id)
        .join(Team, Team.id == Player.team_id)
        .filter(Team.dissolved_at.is_(None), Player.is_bot == False)  # noqa: E712
        .all()
    )
    for player_id, team_id in members:
        ensure_team_season_member(db, team_id, season.id, player_id)
    db.flush()
    return len(members)


def detach_player_from_teams(db, player) -> None:
    """
    Before hard-deleting a player: drop their roster rows, unlink their audit
    entries and leave their team (dissolving it when it ends up empty).
    """
    from db.models import Team, TeamMembershipLog, TeamSeasonMember

    db.query(TeamSeasonMember).filter(TeamSeasonMember.player_id == player.id).delete(synchronize_session=False)
    db.query(TeamMembershipLog).filter(TeamMembershipLog.player_id == player.id).update(
        {TeamMembershipLog.player_id: None}, synchronize_session=False
    )
    db.query(TeamMembershipLog).filter(TeamMembershipLog.actor_player_id == player.id).update(
        {TeamMembershipLog.actor_player_id: None}, synchronize_session=False
    )
    if player.team_id:
        team = db.get(Team, player.team_id)
        log_team_event(db, team.id, "removed", "admin", detail=f"deleted player {player.username}")
        player.team_id = None
        db.flush()
        dissolve_if_empty(db, team)
    db.flush()
