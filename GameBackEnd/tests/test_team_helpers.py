import pytest

from datetime import datetime

from db.models import Team
from services.teams import (
    JOIN_CODE_ALPHABET,
    InvalidTeamName,
    clean_name,
    generate_join_code,
    generate_unique_join_code,
    normalize_join_code,
    normalize_name,
)


@pytest.mark.parametrize("raw, expected", [
    ("  Red Lancers ", "Red Lancers"),
    ("Los Ñandúes", "Los Ñandúes"),
    ("team_42-b", "team_42-b"),
    ("abc", "abc"),
    ("x" * 32, "x" * 32),
])
def test_clean_name_accepts_valid_names(raw, expected):
    assert clean_name(raw) == expected


@pytest.mark.parametrize("raw", [None, "", "ab", "x" * 33, "Red  Lancers", "Red!Lancers", "Red.Lancers", "<script>", "emoji 🔥"])
def test_clean_name_rejects_invalid_names(raw):
    with pytest.raises(InvalidTeamName):
        clean_name(raw)


def test_normalize_name_ignores_case_accents_and_spaces():
    assert normalize_name("Los Hackers") == normalize_name("los hackérs")
    assert normalize_name("Ñandú") == "nandu"
    assert normalize_name("  A   B ") == "a b"


def test_normalized_name_fits_its_column():
    longest = "ﬁ" * 32  # NFKD expands each ligature to two letters
    assert len(normalize_name(clean_name(longest))) <= Team.__table__.c.name_normalized.type.length


def test_join_code_shape():
    for _ in range(50):
        code = generate_join_code()
        assert len(code) == 8
        assert set(code) <= set(JOIN_CODE_ALPHABET)
    assert not set("01ILO") & set(JOIN_CODE_ALPHABET)


def test_normalize_join_code():
    assert normalize_join_code("  ab3d ") == "AB3D"
    assert normalize_join_code(None) == ""


def test_generate_unique_join_code_skips_codes_of_active_teams(db, monkeypatch):
    db.add(Team(name="Taken", name_normalized="taken", join_code="AAAAAAAA"))
    db.add(Team(name="Old", name_normalized="old", join_code="BBBBBBBB", dissolved_at=datetime.utcnow()))
    db.commit()

    codes = iter(["AAAAAAAA", "BBBBBBBB"])
    monkeypatch.setattr("services.teams.generate_join_code", lambda: next(codes))

    # AAAAAAAA belongs to an active team; BBBBBBBB only to a dissolved one, so it is free again.
    assert generate_unique_join_code(db) == "BBBBBBBB"
