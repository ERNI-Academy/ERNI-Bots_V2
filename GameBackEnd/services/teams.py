"""
Team helpers (docs/specs/teams.md).

Phase 1: pure helpers for team names and join codes.
"""

from __future__ import annotations

import re
import secrets
import string
import unicodedata

NAME_MIN_LENGTH = 3
NAME_MAX_LENGTH = 32
NAME_EXTRA_CHARS = frozenset(" -_")

# No ambiguous characters (0/O, 1/I/L), so codes can be read aloud and typed.
JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
JOIN_CODE_LENGTH = 8
_JOIN_CODE_MAX_ATTEMPTS = 20

_SPACES = re.compile(r"\s+")


class InvalidTeamName(ValueError):
    """Raised when a team name breaks RN-13."""


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
