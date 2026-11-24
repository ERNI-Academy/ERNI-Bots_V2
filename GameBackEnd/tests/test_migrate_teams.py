"""migrate_teams.py against a pre-teams schema (only the tables and columns it touches)."""

import importlib.util
import os

from sqlalchemy import create_engine, inspect, text

LEGACY_SCHEMA = [
    "CREATE TABLE players (id VARCHAR PRIMARY KEY, username VARCHAR(50))",
    "CREATE TABLE seasons (id VARCHAR PRIMARY KEY, name VARCHAR(100), is_active BOOLEAN, finalized BOOLEAN, start_date DATETIME)",
    "CREATE TABLE player_season_stats (id VARCHAR PRIMARY KEY, player_id VARCHAR, season_id VARCHAR, score INTEGER)",
    "CREATE TABLE fortress_season_stats (id VARCHAR PRIMARY KEY, fortress_id VARCHAR, season_id VARCHAR)",
    "CREATE TABLE player_history_entries (id VARCHAR PRIMARY KEY, player_id VARCHAR)",
    "CREATE TABLE prizes (id VARCHAR PRIMARY KEY, name VARCHAR(200))",
    "CREATE TABLE app_config (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, description TEXT, updated_at DATETIME)",
    "INSERT INTO seasons VALUES ('s-played', 'Played', 0, 1, '2026-01-01 00:00:00')",
    "INSERT INTO seasons VALUES ('s-active', 'Active', 1, 0, '2026-02-01 00:00:00')",
    "INSERT INTO seasons VALUES ('s-stats', 'With stats', 0, 0, '2026-03-01 00:00:00')",
    "INSERT INTO seasons VALUES ('s-future', 'Future', 0, 0, '2026-12-01 00:00:00')",
    "INSERT INTO player_season_stats VALUES ('pss', 'p', 's-stats', 3)",
    "INSERT INTO app_config (key, value) VALUES ('team_max_size', '8')",
]


def _load_migration(monkeypatch, engine):
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "migrate_teams.py")
    spec = importlib.util.spec_from_file_location("migrate_teams_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, "engine", engine)
    return module


def test_migration_upgrades_legacy_schema_and_is_idempotent(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as conn:
        for statement in LEGACY_SCHEMA:
            conn.execute(text(statement))  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text -- hardcoded test fixture DDL, not user input

    migration = _load_migration(monkeypatch, engine)
    migration.run()
    migration.run()  # second run must be a no-op

    inspector = inspect(engine)
    for table in ("teams", "team_membership_log", "team_season_members"):
        assert inspector.has_table(table)
    for table, column, _ in migration.NEW_COLUMNS:
        assert column in {c["name"] for c in inspector.get_columns(table)}, f"{table}.{column}"
    assert "idx_player_team" in {i["name"] for i in inspector.get_indexes("players")}
    assert {"uq_team_name_active", "uq_team_join_code_active"} <= {i["name"] for i in inspector.get_indexes("teams")}

    with engine.connect() as conn:
        seasons = dict(conn.execute(text("SELECT id, first_activated_at IS NOT NULL FROM seasons")).all())
        modes = {row[0] for row in conn.execute(text("SELECT mode FROM seasons"))}
        config = dict(conn.execute(text("SELECT key, value FROM app_config")).all())

    assert seasons == {"s-played": 1, "s-active": 1, "s-stats": 1, "s-future": 0}
    assert modes == {"individual"}
    assert config == {
        "team_max_size": "8",  # existing value preserved
        "team_creation_enabled": "true",
        "team_joining_enabled": "true",
        "team_leaving_enabled": "true",
        "team_self_management_enabled": "true",
    }
