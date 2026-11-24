import pytest

from db.models import AppConfig
from settings_registry import REGISTRY, get_setting, get_settings, parse_stored, serialize, validate_input

BOOL = REGISTRY["team_creation_enabled"]
INT = REGISTRY["team_max_size"]


def test_team_settings_are_registered_with_spec_defaults():
    assert INT.type == "int" and INT.default == 5 and (INT.min, INT.max) == (1, 50)
    for key in ("team_creation_enabled", "team_joining_enabled", "team_leaving_enabled", "team_self_management_enabled"):
        assert REGISTRY[key].type == "bool"
        assert REGISTRY[key].default is True


@pytest.mark.parametrize("raw, expected", [("true", True), ("FALSE", False), (" true ", True), (None, True), ("yes", True)])
def test_parse_stored_bool(raw, expected):
    assert parse_stored(BOOL, raw) is expected


@pytest.mark.parametrize("raw, expected", [("8", 8), ("1", 1), ("50", 50), (None, 5), ("0", 5), ("51", 5), ("abc", 5)])
def test_parse_stored_int_falls_back_to_default_when_invalid(raw, expected):
    assert parse_stored(INT, raw) == expected


@pytest.mark.parametrize("raw, expected", [(True, "true"), (False, "false"), ("True", "true"), ("false", "false")])
def test_validate_bool(raw, expected):
    assert validate_input(BOOL, raw) == expected


@pytest.mark.parametrize("raw", ["1", "yes", "", 1])
def test_validate_bool_rejects_non_booleans(raw):
    with pytest.raises(ValueError):
        validate_input(BOOL, raw)


@pytest.mark.parametrize("raw, expected", [(3, "3"), ("12", "12"), (" 7 ", "7"), (1, "1"), (50, "50")])
def test_validate_int(raw, expected):
    assert validate_input(INT, raw) == expected


@pytest.mark.parametrize("raw", [0, 51, -1, "3.5", "abc", True, ""])
def test_validate_int_rejects_out_of_range_and_non_integers(raw):
    with pytest.raises(ValueError):
        validate_input(INT, raw)


def test_serialize_roundtrip():
    assert serialize(INT, 9) == "9"
    assert serialize(BOOL, False) == "false"


def test_get_settings_reads_rows_and_defaults(db):
    db.add(AppConfig(key="team_max_size", value="8"))
    db.add(AppConfig(key="team_joining_enabled", value="false"))
    db.commit()

    assert get_setting(db, "team_max_size") == 8
    assert get_settings(db, ["team_joining_enabled", "team_leaving_enabled"]) == {
        "team_joining_enabled": False,
        "team_leaving_enabled": True,
    }
