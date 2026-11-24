"""Season mode and activation (RN-60..64), team prize winners (RN-90) and player views."""

from conftest import ADMIN_HEADERS
from db.models import PlayerSeasonStats, Prize, Season, Team, TeamMembershipLog, TeamSeasonMember
import factories as f

H = ADMIN_HEADERS


# ── Seasons ───────────────────────────────────────────────

def test_create_season_with_mode(client):
    team = client.post("/api/v1/admin/seasons", json={"name": "Equipos", "mode": "team"}, headers=H).get_json()
    default = client.post("/api/v1/admin/seasons", json={"name": "Solo"}, headers=H).get_json()
    invalid = client.post("/api/v1/admin/seasons", json={"name": "X", "mode": "duo"}, headers=H)

    assert (team["mode"], team["mode_editable"], team["first_activated_at"]) == ("team", True, None)
    assert default["mode"] == "individual"
    assert (invalid.status_code, invalid.get_json()["code"]) == (400, "invalid_mode")


def test_mode_is_editable_only_until_the_first_activation(client, db):
    s = f.season(db, mode="individual", active=False)

    edited = client.put(f"/api/v1/admin/seasons/{s.id}", json={"mode": "team"}, headers=H)
    client.post(f"/api/v1/admin/seasons/{s.id}/activate", headers=H)
    locked = client.put(f"/api/v1/admin/seasons/{s.id}", json={"mode": "individual"}, headers=H)
    same = client.put(f"/api/v1/admin/seasons/{s.id}", json={"mode": "team", "name": "Renamed"}, headers=H)

    assert edited.get_json()["mode"] == "team"
    assert (locked.status_code, locked.get_json()["code"]) == (409, "mode_locked")
    assert same.status_code == 200 and same.get_json()["name"] == "Renamed"


def test_activating_a_team_season_snapshots_current_rosters(client, db):
    previous = f.season(db, mode="individual")
    s = f.season(db, mode="team", active=False)
    red, gone = f.team(db, "Red"), f.team(db, "Gone", dissolved=True)
    a, b = f.player(db, team=red), f.player(db, team=red)
    f.player(db)                      # no team
    f.player(db, team=gone)           # stale link to a dissolved team

    body = client.post(f"/api/v1/admin/seasons/{s.id}/activate", headers=H).get_json()

    assert body["is_active"] is True and body["first_activated_at"] is not None
    db.expire_all()
    assert db.get(Season, previous.id).is_active is False
    rows = {(r.team_id, r.player_id, r.score) for r in db.query(TeamSeasonMember).filter_by(season_id=s.id)}
    assert rows == {(red.id, a.id, 0), (red.id, b.id, 0)}


def test_activating_an_individual_season_creates_no_rosters(client, db):
    s = f.season(db, mode="individual", active=False)
    f.player(db, team=f.team(db))

    client.post(f"/api/v1/admin/seasons/{s.id}/activate", headers=H)

    assert db.query(TeamSeasonMember).count() == 0


def test_reactivation_only_adds_missing_roster_rows(client, db):
    s = f.season(db, mode="team", active=False, finalized=True)
    red = f.team(db)
    veteran, newcomer = f.player(db, team=red), f.player(db, team=red)
    f.roster(db, red, s, veteran, score=15)

    client.post(f"/api/v1/admin/seasons/{s.id}/reactivate", headers=H)

    rows = {(r.player_id, r.score) for r in db.query(TeamSeasonMember).filter_by(season_id=s.id)}
    assert rows == {(veteran.id, 15), (newcomer.id, 0)}


def test_delete_season_with_team_rows(client, db):
    empty = f.season(db, active=False)
    scored = f.season(db, active=False)
    t = f.team(db)
    p = f.player(db, team=t)
    f.roster(db, t, empty, p, score=0)
    f.roster(db, t, scored, p, score=3)

    assert client.delete(f"/api/v1/admin/seasons/{scored.id}", headers=H).status_code == 409
    assert client.delete(f"/api/v1/admin/seasons/{empty.id}", headers=H).status_code == 200
    assert db.query(TeamSeasonMember).filter_by(season_id=empty.id).count() == 0


# ── Prizes ────────────────────────────────────────────────

def test_prize_winner_is_a_player_or_a_team(client, db):
    t = f.team(db, "Red")
    prize_id = client.post("/api/v1/admin/prizes", json={"name": "Copa", "winner_username": "alice"}, headers=H).get_json()["id"]

    to_team = client.put(f"/api/v1/admin/prizes/{prize_id}", json={"winner_team_id": t.id}, headers=H).get_json()
    assert (to_team["winner_username"], to_team["winner_team"]) == (None, {"id": t.id, "name": "Red"})

    to_player = client.put(f"/api/v1/admin/prizes/{prize_id}", json={"winner_username": "bob"}, headers=H).get_json()
    assert (to_player["winner_username"], to_player["winner_team_id"]) == ("bob", None)

    both = client.put(f"/api/v1/admin/prizes/{prize_id}", json={"winner_username": "c", "winner_team_id": t.id}, headers=H)
    unknown = client.put(f"/api/v1/admin/prizes/{prize_id}", json={"winner_team_id": "missing"}, headers=H)
    assert (both.status_code, both.get_json()["code"]) == (400, "two_winners")
    assert (unknown.status_code, unknown.get_json()["code"]) == (404, "team_not_found")
    assert db.get(Prize, prize_id).winner_username == "bob"

    cleared = client.put(f"/api/v1/admin/prizes/{prize_id}", json={"winner_username": "", "winner_team_id": None}, headers=H).get_json()
    assert (cleared["winner_username"], cleared["winner_team_id"]) == (None, None)


def test_create_prize_with_team_winner(client, db):
    t = f.team(db, "Blue")

    body = client.post("/api/v1/admin/prizes", json={"name": "Equipo", "winner_team_id": t.id}, headers=H).get_json()

    assert body["winner_team"]["name"] == "Blue"


# ── Players ───────────────────────────────────────────────

def test_player_views_include_the_team(client, db):
    f.season(db, mode="individual")
    t = f.team(db, "Red")
    p = f.player(db, "alice", team=t)

    listed = client.get("/api/v1/admin/users?q=alice", headers=H).get_json()["items"]
    detail = client.get(f"/api/v1/admin/users/{p.id}", headers=H).get_json()

    assert listed[0]["team"] == {"id": t.id, "name": "Red"}
    assert detail["team"] == {"id": t.id, "name": "Red"}


def test_deleting_a_player_unlinks_team_data_and_dissolves_an_emptied_team(client, db):
    s = f.season(db)
    t = f.team(db)
    p = f.player(db, team=t)
    db.add(PlayerSeasonStats(player_id=p.id, season_id=s.id, score=2))
    db.add(TeamMembershipLog(team_id=t.id, player_id=p.id, actor_player_id=p.id, event="joined", actor="player"))
    db.commit()
    f.roster(db, t, s, p, score=2)

    player_id = p.id
    response = client.delete(f"/api/v1/admin/users/{player_id}", headers=H)

    assert response.status_code == 200
    db.expire_all()
    assert db.query(TeamSeasonMember).count() == 0
    assert db.query(TeamMembershipLog).filter(
        (TeamMembershipLog.player_id == player_id) | (TeamMembershipLog.actor_player_id == player_id)
    ).count() == 0
    assert db.get(Team, t.id).dissolved_reason == "empty"
