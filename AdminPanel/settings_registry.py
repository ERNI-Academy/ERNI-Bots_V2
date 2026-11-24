"""
Typed registry of the AppConfig keys editable from the admin panel.

AppConfig stores every value as a string. This registry gives each key a type
('bool' | 'int'), a default, optional bounds and whether the public
GET /api/v1/config endpoint may expose it.

DUPLICATED in AdminPanel/settings_registry.py: both backends share the same
database, so keep the two copies identical.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Setting:
    key: str
    type: str  # "bool" | "int"
    default: bool | int
    description: str
    public: bool = True
    min: int | None = None
    max: int | None = None


SETTINGS: tuple[Setting, ...] = (
    Setting(
        key="invitations_enabled",
        type="bool",
        default=True,
        description=(
            "Controls whether the [ GENERAR ] button is shown on the register page "
            "and the admin generate-code endpoint respects it."
        ),
    ),
    Setting(
        key="player_invitations_enabled",
        type="bool",
        default=True,
        description=(
            "Controls whether authenticated players can generate invitation codes "
            "for other users via POST /players/me/invitations."
        ),
    ),
    Setting(
        key="bot_fortresses_enabled",
        type="bool",
        default=True,
        description=(
            "Controls whether bot fortresses are active and can be attacked by players. "
            "When disabled, bot fortresses are hidden and no battles against them are allowed."
        ),
    ),
    Setting(
        key="team_max_size",
        type="int",
        default=5,
        min=1,
        max=50,
        description=(
            "Maximum number of players per team. Lowering it keeps existing larger "
            "teams as they are, but they accept no new members."
        ),
    ),
    Setting(
        key="team_creation_enabled",
        type="bool",
        default=True,
        description="Controls whether players can create teams. Admins can always create them.",
    ),
    Setting(
        key="team_joining_enabled",
        type="bool",
        default=True,
        description="Controls whether players can join a team with its join code.",
    ),
    Setting(
        key="team_leaving_enabled",
        type="bool",
        default=True,
        description=(
            "Controls whether players can leave their team. Leaving is also blocked "
            "while a team season is running."
        ),
    ),
    Setting(
        key="team_self_management_enabled",
        type="bool",
        default=True,
        description=(
            "When enabled any member can rename the team and regenerate its join code. "
            "When disabled only admins can."
        ),
    ),
)

REGISTRY: dict[str, Setting] = {s.key: s for s in SETTINGS}
PUBLIC_KEYS: tuple[str, ...] = tuple(s.key for s in SETTINGS if s.public)


def serialize(setting: Setting, value: bool | int) -> str:
    """Typed value -> canonical string stored in AppConfig.value."""
    if setting.type == "bool":
        return "true" if value else "false"
    return str(int(value))


def parse_stored(setting: Setting, raw: str | None) -> bool | int:
    """Stored string -> typed value. Missing or malformed values fall back to the default."""
    if raw is None:
        return setting.default
    raw = raw.strip().lower()
    if setting.type == "bool":
        if raw in ("true", "false"):
            return raw == "true"
        return setting.default
    try:
        value = int(raw)
    except ValueError:
        return setting.default
    if not _within_bounds(setting, value):
        return setting.default
    return value


def validate_input(setting: Setting, raw: object) -> str:
    """
    Validate a value received from the admin API and return its canonical string.
    Raises ValueError with a client-facing message when the value is invalid.
    """
    if setting.type == "bool":
        if isinstance(raw, bool):
            return serialize(setting, raw)
        text_value = str(raw).strip().lower()
        if text_value not in ("true", "false"):
            raise ValueError("'value' must be 'true' or 'false'")
        return text_value

    if isinstance(raw, bool):
        raise ValueError("'value' must be an integer")
    try:
        value = int(str(raw).strip())
    except ValueError:
        raise ValueError("'value' must be an integer") from None
    if not _within_bounds(setting, value):
        raise ValueError(f"'value' must be between {setting.min} and {setting.max}")
    return serialize(setting, value)


def _within_bounds(setting: Setting, value: int) -> bool:
    if setting.min is not None and value < setting.min:
        return False
    if setting.max is not None and value > setting.max:
        return False
    return True


def get_setting(db, key: str) -> bool | int:
    """Read one typed setting from AppConfig (default when the row is missing)."""
    from db.models import AppConfig

    setting = REGISTRY[key]
    row = db.get(AppConfig, key)
    return parse_stored(setting, row.value if row else None)


def get_settings(db, keys) -> dict[str, bool | int]:
    """Read several typed settings in one query."""
    from db.models import AppConfig

    keys = list(keys)
    rows = db.query(AppConfig).filter(AppConfig.key.in_(keys)).all()
    stored = {row.key: row.value for row in rows}
    return {key: parse_stored(REGISTRY[key], stored.get(key)) for key in keys}
