from db.models import AppConfig, Season


def test_public_config_exposes_typed_team_settings(client, db):
    db.add(AppConfig(key="team_max_size", value="7"))
    db.add(AppConfig(key="team_creation_enabled", value="false"))
    db.commit()

    body = client.get("/api/v1/config/").get_json()

    assert body["team_max_size"] == 7
    assert body["team_creation_enabled"] is False
    assert body["team_joining_enabled"] is True  # default when the row is missing
    assert body["invitations_enabled"] is True
    assert body["season_mode"] is None
    assert body["season_status"] == "none"


def test_public_config_reports_active_team_season_mode(client, db):
    db.add(Season(name="Equipos", mode="team", is_active=True))
    db.commit()

    body = client.get("/api/v1/config/").get_json()

    assert body["season_status"] == "active"
    assert body["season_mode"] == "team"


def test_new_seasons_default_to_individual(db):
    season = Season(name="S")
    db.add(season)
    db.commit()
    db.refresh(season)

    assert season.mode == "individual"
    assert season.first_activated_at is None
