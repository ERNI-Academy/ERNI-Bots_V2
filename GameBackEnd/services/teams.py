"""
Team domain logic (docs/specs/teams.md).

DUPLICATED in GameBackEnd/services/teams.py and AdminPanel/services/teams.py:
keep both copies identical (D20). Admin-only operations live in
AdminPanel/services/team_admin.py.

Routes translate TeamError into HTTP responses; everything else (rules, locks,
roster rows, audit log) lives here so the battle, matchmaking and team routes
apply exactly the same rules.

Callers own the transaction: these functions flush but never commit.
"""

from __future__ import annotations

import re
import secrets
import string
import unicodedata
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from settings_registry import get_settings

NAME_MIN_LENGTH = 3
NAME_MAX_LENGTH = 32
NAME_EXTRA_CHARS = frozenset(" -_")

# No ambiguous characters (0/O, 1/I/L), so codes can be read aloud and typed.
JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
JOIN_CODE_LENGTH = 8
_JOIN_CODE_MAX_ATTEMPTS = 20

TEAM_SETTING_KEYS = (
    "team_max_size",
    "team_creation_enabled",
    "team_joining_enabled",
    "team_leaving_enabled",
    "team_self_management_enabled",
)

_SPACES = re.compile(r"\s+")


# ──────────────────────────────────────────────────────────
# Errors
# ──────────────────────────────────────────────────────────

class TeamError(Exception):
    """A business-rule violation, mapped by routes to {"error", "code"} + status."""

    def __init__(self, code: str, message: str, status: int):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


class InvalidTeamName(TeamError):
    """Raised when a team name breaks RN-13."""

    def __init__(self, message: str):
        super().__init__("invalid_name", message, 400)


def _error(code: str) -> TeamError:
    message, status = _ERRORS[code]
    return TeamError(code, message, status)


_ERRORS = {
    "team_creation_disabled": ("La creación de equipos está desactivada", 403),
    "team_joining_disabled": ("La entrada en equipos está desactivada", 403),
    "team_leaving_disabled": ("La salida de equipos está desactivada", 403),
    "self_management_disabled": ("Solo un administrador puede gestionar el equipo", 403),
    "bots_cannot_join": ("Los bots no pueden pertenecer a equipos", 403),
    "already_in_team": ("Ya perteneces a un equipo", 409),
    "not_in_team": ("No perteneces a ningún equipo", 409),
    "name_taken": ("Ya existe un equipo con ese nombre", 409),
    "invalid_code": ("Código de equipo no válido", 404),
    "team_full": ("El equipo está completo", 409),
    "season_locked": ("No puedes salir del equipo durante una temporada por equipos", 409),
}


# ──────────────────────────────────────────────────────────
# Names and join codes (pure helpers)
# ──────────────────────────────────────────────────────────

def clean_name(raw: str | None) -> str:
    """
    Validate a team name (RN-13) and return it trimmed.
    3–32 characters: letters (accents and ñ included), digits, space, '-' and '_',
    without consecutive spaces.
    """
    name = (raw or "").strip()
    if not NAME_MIN_LENGTH <= len(name) <= NAME_MAX_LENGTH:
        raise InvalidTeamName(
            f"El nombre debe tener entre {NAME_MIN_LENGTH} y {NAME_MAX_LENGTH} caracteres"
        )
    if "  " in name:
        raise InvalidTeamName("El nombre no puede tener espacios seguidos")
    for ch in name:
        if not (ch.isalpha() or ch in string.digits or ch in NAME_EXTRA_CHARS):
            raise InvalidTeamName(
                "El nombre solo puede tener letras, números, espacios, '-' y '_'"
            )
    return name


def normalize_name(name: str) -> str:
    """Uniqueness key: lowercase, accents stripped, whitespace collapsed."""
    decomposed = unicodedata.normalize("NFKD", name)
    without_accents = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return _SPACES.sub(" ", without_accents).strip().lower()


def normalize_join_code(raw: str | None) -> str:
    """Join codes are case-insensitive and may be typed with surrounding spaces."""
    return (raw or "").strip().upper()


def generate_join_code() -> str:
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(JOIN_CODE_LENGTH))


def generate_unique_join_code(db) -> str:
    """A join code not used by any active (non-dissolved) team."""
    from db.models import Team

    for _ in range(_JOIN_CODE_MAX_ATTEMPTS):
        code = generate_join_code()
        taken = (
            db.query(Team.id)
            .filter(Team.join_code == code, Team.dissolved_at.is_(None))
            .first()
        )
        if taken is None:
            return code
    raise RuntimeError("Could not generate a unique team join code")


# ──────────────────────────────────────────────────────────
# Seasons, settings and lookups
# ──────────────────────────────────────────────────────────

def is_team_season(season) -> bool:
    """True when `season` is a running team season (active, not finalized; frozen counts)."""
    return bool(season and season.is_active and not season.finalized and season.mode == "team")


def get_running_team_season(db):
    from db.models import Season

    season = db.query(Season).filter_by(is_active=True).first()
    return season if is_team_season(season) else None


def get_team_settings(db) -> dict:
    return get_settings(db, TEAM_SETTING_KEYS)


def member_count(db, team_id: str) -> int:
    from db.models import Player

    return db.query(func.count(Player.id)).filter(Player.team_id == team_id).scalar() or 0


def get_active_team_by_code(db, raw_code: str | None, lock: bool = False):
    from db.models import Team

    code = normalize_join_code(raw_code)
    if len(code) != JOIN_CODE_LENGTH:
        return None
    query = db.query(Team).filter(Team.join_code == code, Team.dissolved_at.is_(None))
    if lock:
        query = query.with_for_update()
    return query.first()


def _lock_player(db, player):
    """Re-read the player row FOR UPDATE (PostgreSQL) so concurrent requests serialize."""
    from db.models import Player

    return db.query(Player).filter(Player.id == player.id).with_for_update().one()


def team_scores(db, season_id: str) -> dict[str, int]:
    """{team_id: score} for a season (RN-80)."""
    from db.models import TeamSeasonMember

    rows = (
        db.query(TeamSeasonMember.team_id, func.coalesce(func.sum(TeamSeasonMember.score), 0))
        .filter(TeamSeasonMember.season_id == season_id)
        .group_by(TeamSeasonMember.team_id)
        .all()
    )
    return {team_id: int(score) for team_id, score in rows}


def ensure_team_season_member(db, team_id: str, season_id: str, player_id: str) -> None:
    """Create the (team, season, player) roster row if missing (RN-21, RN-62)."""
    from db.models import TeamSeasonMember
    from utils import generate_uuid

    insert = pg_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    db.execute(
        insert(TeamSeasonMember.__table__)
        .values(
            id=generate_uuid(),
            team_id=team_id,
            season_id=season_id,
            player_id=player_id,
            score=0,
            joined_at=datetime.utcnow(),
        )
        .on_conflict_do_nothing(index_elements=["team_id", "season_id", "player_id"])
    )


def log_team_event(db, team_id, event, actor, player_id=None, actor_player_id=None, detail=None):
    from db.models import TeamMembershipLog

    db.add(TeamMembershipLog(
        team_id=team_id,
        player_id=player_id,
        event=event,
        actor=actor,
        actor_player_id=actor_player_id,
        detail=detail,
    ))


def _ensure_name_free(db, name: str, exclude_team_id: str | None = None) -> str:
    from db.models import Team

    normalized = normalize_name(name)
    query = db.query(Team.id).filter(Team.name_normalized == normalized, Team.dissolved_at.is_(None))
    if exclude_team_id:
        query = query.filter(Team.id != exclude_team_id)
    if query.first() is not None:
        raise _error("name_taken")
    return normalized


def _join_running_season(db, team_id: str, player_id: str) -> None:
    season = get_running_team_season(db)
    if season:
        ensure_team_season_member(db, team_id, season.id, player_id)


def dissolve_if_empty(db, team) -> bool:
    """RN-03: a team left without members is dissolved (reason 'empty')."""
    if member_count(db, team.id) > 0:
        return False
    team.dissolved_at = datetime.utcnow()
    team.dissolved_reason = "empty"
    log_team_event(db, team.id, "dissolved", "system", detail="empty")
    return True


# ──────────────────────────────────────────────────────────
# Player operations
# ──────────────────────────────────────────────────────────

def create_team(db, player, raw_name: str | None):
    """RN-10..14: create a team with `player` as its first member."""
    from db.models import ActivityLog, Team

    if not get_team_settings(db)["team_creation_enabled"]:
        raise _error("team_creation_disabled")
    player = _lock_player(db, player)
    if player.is_bot:
        raise _error("bots_cannot_join")
    if player.team_id:
        raise _error("already_in_team")

    name = clean_name(raw_name)
    normalized = _ensure_name_free(db, name)

    team = Team(
        name=name,
        name_normalized=normalized,
        join_code=generate_unique_join_code(db),
        created_by_player_id=player.id,
    )
    db.add(team)
    db.flush()

    player.team_id = team.id
    log_team_event(db, team.id, "created", "player", actor_player_id=player.id)
    log_team_event(db, team.id, "joined", "player", player_id=player.id, actor_player_id=player.id)
    _join_running_season(db, team.id, player.id)
    db.add(ActivityLog(
        type="team_created",
        actor_id=player.id,
        target_id=team.id,
        message=f"{player.username} ha fundado el equipo {team.name}",
    ))
    db.flush()
    return team


def join_team(db, player, raw_code: str | None):
    """RN-20..22: join a team with its code, serialized on the team row."""
    from db.models import ActivityLog

    settings = get_team_settings(db)
    if not settings["team_joining_enabled"]:
        raise _error("team_joining_disabled")
    player = _lock_player(db, player)
    if player.is_bot:
        raise _error("bots_cannot_join")
    if player.team_id:
        raise _error("already_in_team")

    team = get_active_team_by_code(db, raw_code, lock=True)
    if team is None:
        raise _error("invalid_code")
    if member_count(db, team.id) >= settings["team_max_size"]:
        raise _error("team_full")

    player.team_id = team.id
    log_team_event(db, team.id, "joined", "player", player_id=player.id, actor_player_id=player.id)
    _join_running_season(db, team.id, player.id)
    db.add(ActivityLog(
        type="team_joined",
        actor_id=player.id,
        target_id=team.id,
        message=f"{player.username} se ha unido al equipo {team.name}",
    ))
    db.flush()
    return team


def leave_team(db, player) -> None:
    """RN-30..31: leave the current team; an emptied team is dissolved."""
    from db.models import Team

    if not get_team_settings(db)["team_leaving_enabled"]:
        raise _error("team_leaving_disabled")
    player = _lock_player(db, player)
    if not player.team_id:
        raise _error("not_in_team")
    if get_running_team_season(db):
        raise _error("season_locked")

    team = db.query(Team).filter(Team.id == player.team_id).with_for_update().one()
    player.team_id = None
    log_team_event(db, team.id, "left", "player", player_id=player.id, actor_player_id=player.id)
    db.flush()
    dissolve_if_empty(db, team)
    db.flush()


def _managed_team(db, player):
    """The player's team, if the player may manage it (RN-40)."""
    from db.models import Team

    if not player.team_id:
        raise _error("not_in_team")
    if not get_team_settings(db)["team_self_management_enabled"]:
        raise _error("self_management_disabled")
    return db.query(Team).filter(Team.id == player.team_id).with_for_update().one()


def rename_team(db, player, raw_name: str | None):
    team = _managed_team(db, player)
    name = clean_name(raw_name)
    if name == team.name:
        return team
    normalized = _ensure_name_free(db, name, exclude_team_id=team.id)
    old_name = team.name
    team.name = name
    team.name_normalized = normalized
    log_team_event(db, team.id, "renamed", "player", actor_player_id=player.id, detail=old_name)
    db.flush()
    return team


def regenerate_join_code(db, player):
    team = _managed_team(db, player)
    team.join_code = generate_unique_join_code(db)
    log_team_event(db, team.id, "code_regenerated", "player", actor_player_id=player.id)
    db.flush()
    return team


# ──────────────────────────────────────────────────────────
# Battle rules (RN-70..72)
# ──────────────────────────────────────────────────────────

BATTLE_RULE_MESSAGES = {
    "team_required": "Esta temporada es por equipos. Únete a un equipo para jugar.",
    "target_not_participating": "Ese jugador no participa en esta temporada por equipos.",
    "same_team": "No puedes atacar la fortaleza de un compañero de equipo.",
}


def team_battle_violation(season, attacker, target_owner=None) -> str | None:
    """
    The rule a battle breaks in a running team season, or None.
    `target_owner` is the fortress owner for PvP and None for bosses.
    Bots never belong to teams but stay attackable (D9).
    """
    if not is_team_season(season):
        return None
    if attacker.team_id is None:
        return "team_required"
    if target_owner is None or target_owner.is_bot:
        return None
    if target_owner.team_id is None:
        return "target_not_participating"
    if target_owner.team_id == attacker.team_id:
        return "same_team"
    return None
