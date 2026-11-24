"""Admin team management (RN-50..55)."""

import pytest

from conftest import ADMIN_HEADERS
from db.models import Player, Team, TeamMembershipLog, TeamSeasonMember
import factories as f

H = ADMIN_HEADERS


def _team_ids(db, team):
    return {p.id for p in db.query(Player).filter_by(team_id=team.id)}


def test_every_team_endpoint_requires_the_admin_secret(client, db):
    t = f.team(db)
    for method, url in [
        ("get", "/api/v1/admin/teams"),
        ("post", "/api/v1/admin/teams"),
        ("get", "/api/v1/admin/teams/available-players"),
        ("get", f"/api/v1/admin/teams/{t.id}"),
        ("patch", f"/api/v1/admin/teams/{t.id}"),
        ("post", f"/api/v1/admin/teams/{t.id}/regenerate-code"),
        ("post", f"/api/v1/admin/teams/{t.id}/members"),
        ("delete", f"/api/v1/admin/teams/{t.id}/members/x"),
        ("post", f"/api/v1/admin/teams/{t.id}/members/x/move"),
        ("post", f"/api/v1/admin/teams/{t.id}/dissolve"),
        ("post", "/api/v1/admin/teams/dissolve-all"),
    ]:
        assert getattr(client, method)(url, json={}).status_code == 403, url


# ── Create ────────────────────────────────────────────────

def test_admin_creates_a_team_with_members_even_when_players_cannot(client, db):
    f.set_config(db, team_creation_enabled=False)
    a, b = f.player(db, "a"), f.player(db, "b")

    response = client.post("/api/v1/admin/teams", json={"name": "Admins Pick", "member_ids": [a.id, b.id]}, headers=H)

    assert response.status_code == 201
    body = response.get_json()
    assert body["created_by_admin"] is True
    assert [m["username"] for m in body["members"]] == ["a", "b"]
    assert {(e["event"], e["actor"]) for e in body["log"]} == {("created", "admin"), ("joined", "admin")}


@pytest.mark.parametrize("case, code", [("bot", "bots_cannot_join"), ("in_team", "already_in_team"), ("too_many", "team_full")])
def test_admin_create_respects_one_team_no_bots_and_max_size(client, db, case, code):
    f.set_config(db, team_max_size=2)
    members = {
        "bot": [f.player(db, is_bot=True)],
        "in_team": [f.player(db, team=f.team(db))],
        "too_many": [f.player(db), f.player(db), f.player(db)],
    }[case]

    response = client.post("/api/v1/admin/teams", json={"name": "Nope", "member_ids": [p.id for p in members]}, headers=H)

    assert response.get_json()["code"] == code
    assert db.query(Team).filter_by(name="Nope").count() == 0


def test_admin_create_validates_the_name(client, db):
    f.team(db, "Taken")
    assert client.post("/api/v1/admin/teams", json={"name": "x"}, headers=H).get_json()["code"] == "invalid_name"
    assert client.post("/api/v1/admin/teams", json={"name": "TAKEN"}, headers=H).get_json()["code"] == "name_taken"


def test_creating_during_a_team_season_snapshots_the_members(client, db):
    s = f.season(db)
    a = f.player(db)

    client.post("/api/v1/admin/teams", json={"name": "Late", "member_ids": [a.id]}, headers=H)

    assert db.query(TeamSeasonMember).filter_by(season_id=s.id, player_id=a.id).count() == 1


# ── Read ──────────────────────────────────────────────────

def test_list_filters_and_flags_teams_over_the_max(client, db):
    s = f.season(db)
    big, small, gone = f.team(db, "Big"), f.team(db, "Small"), f.team(db, "Gone", dissolved=True)
    for _ in range(3):
        f.player(db, team=big)
    member = f.player(db, team=small)
    f.roster(db, small, s, member, score=7)
    f.set_config(db, team_max_size=2)

    active = {t["name"]: t for t in client.get("/api/v1/admin/teams", headers=H).get_json()}
    dissolved = client.get("/api/v1/admin/teams?status=dissolved", headers=H).get_json()
    # 'i' and 'o' are not in the join-code alphabet, so q only matches names here
    by_name_active = client.get("/api/v1/admin/teams?q=i", headers=H).get_json()
    by_name_all = client.get("/api/v1/admin/teams?status=all&q=o", headers=H).get_json()

    assert set(active) == {"Big", "Small"}
    assert (active["Big"]["member_count"], active["Big"]["over_max"]) == (3, True)
    assert (active["Small"]["over_max"], active["Small"]["score_active_season"]) == (False, 7)
    assert [t["name"] for t in dissolved] == ["Gone"]
    assert [t["name"] for t in by_name_active] == ["Big"]
    assert [t["name"] for t in by_name_all] == ["Gone"]
    assert client.get("/api/v1/admin/teams?status=nope", headers=H).status_code == 400
    assert gone.id  # dissolved teams keep existing


def test_available_players_excludes_bots_and_team_members(client, db):
    f.player(db, "free_one")
    f.player(db, "free_two")
    f.player(db, "freebot", is_bot=True)
    f.player(db, "free_member", team=f.team(db))

    names = [p["username"] for p in client.get("/api/v1/admin/teams/available-players?q=free", headers=H).get_json()]

    assert names == ["free_one", "free_two"]


def test_detail_includes_season_points_and_log(client, db):
    old = f.season(db, active=False, finalized=True)
    t = f.team(db, "Detail")
    p = f.player(db, team=t)
    f.roster(db, t, old, p, score=12)

    body = client.get(f"/api/v1/admin/teams/{t.id}", headers=H).get_json()

    assert body["seasons"] == [{"season_id": old.id, "name": old.name, "is_active": False, "finalized": True, "score": 12, "roster_size": 1}]
    assert body["members"][0]["username"] == p.username
    assert client.get("/api/v1/admin/teams/missing", headers=H).status_code == 404


# ── Rename / code ─────────────────────────────────────────

def test_rename_and_regenerate_ignore_the_self_management_toggle(client, db):
    f.set_config(db, team_self_management_enabled=False)
    t = f.team(db, "Before")
    old_code = t.join_code

    renamed = client.patch(f"/api/v1/admin/teams/{t.id}", json={"name": "After"}, headers=H).get_json()
    regenerated = client.post(f"/api/v1/admin/teams/{t.id}/regenerate-code", headers=H).get_json()

    assert renamed["name"] == "After"
    assert regenerated["join_code"] != old_code
    renamed_event = db.query(TeamMembershipLog).filter_by(team_id=t.id, event="renamed").one()
    assert (renamed_event.actor, renamed_event.detail) == ("admin", "Before")


# ── Members ───────────────────────────────────────────────

def test_add_member_rules(client, db):
    f.set_config(db, team_max_size=1)
    t = f.team(db)
    first = f.player(db)

    assert client.post(f"/api/v1/admin/teams/{t.id}/members", json={"player_id": first.id}, headers=H).status_code == 200
    assert client.post(f"/api/v1/admin/teams/{t.id}/members", json={"player_id": f.player(db).id}, headers=H).get_json()["code"] == "team_full"
    assert client.post(f"/api/v1/admin/teams/{f.team(db).id}/members", json={"player_id": first.id}, headers=H).get_json()["code"] == "already_in_team"
    assert client.post(f"/api/v1/admin/teams/{t.id}/members", json={"player_id": "nobody"}, headers=H).get_json()["code"] == "player_not_found"
    assert client.post(f"/api/v1/admin/teams/{t.id}/members", json={}, headers=H).status_code == 400


def test_remove_ignores_the_season_lock_and_dissolves_empty_teams(client, db):
    f.season(db)  # running team season: players could not leave, the admin can remove
    t = f.team(db)
    a = f.player(db, team=t)

    response = client.delete(f"/api/v1/admin/teams/{t.id}/members/{a.id}", headers=H)

    assert response.status_code == 200
    db.refresh(t)
    assert (t.dissolved_reason, _team_ids(db, t)) == ("empty", set())
    assert client.delete(f"/api/v1/admin/teams/{f.team(db).id}/members/{a.id}", headers=H).get_json()["code"] == "not_in_team"


def test_move_keeps_earned_points_and_joins_the_new_roster(client, db):
    s = f.season(db)
    red, blue = f.team(db, "Red"), f.team(db, "Blue")
    a = f.player(db, team=red)
    f.player(db, team=red)
    f.roster(db, red, s, a, score=9)

    response = client.post(f"/api/v1/admin/teams/{red.id}/members/{a.id}/move", json={"target_team_id": blue.id}, headers=H)

    assert response.status_code == 200 and response.get_json()["id"] == blue.id
    db.expire_all()
    assert db.get(Player, a.id).team_id == blue.id
    rows = {(r.team_id, r.score) for r in db.query(TeamSeasonMember).filter_by(player_id=a.id)}
    assert rows == {(red.id, 9), (blue.id, 0)}
    events = {(e.team_id, e.event) for e in db.query(TeamMembershipLog).filter_by(player_id=a.id)}
    assert {(red.id, "moved_out"), (blue.id, "moved_in")} <= events


def test_move_rules(client, db):
    f.set_config(db, team_max_size=1)
    red, blue, gone = f.team(db), f.team(db), f.team(db, dissolved=True)
    a = f.player(db, team=red)
    f.player(db, team=blue)

    def move(target):
        return client.post(f"/api/v1/admin/teams/{red.id}/members/{a.id}/move", json={"target_team_id": target}, headers=H).get_json()["code"]

    assert move(red.id) == "same_team"
    assert move(blue.id) == "team_full"
    assert move(gone.id) == "team_dissolved"
    assert move(None) == "team_not_found"


# ── Dissolve ──────────────────────────────────────────────

def test_dissolve_frees_members_and_keeps_points(client, db):
    s = f.season(db)
    t = f.team(db)
    a, b = f.player(db, team=t), f.player(db, team=t)
    f.roster(db, t, s, a, score=4)

    body = client.post(f"/api/v1/admin/teams/{t.id}/dissolve", headers=H).get_json()

    assert body["dissolved_reason"] == "admin" and body["members"] == []
    assert db.query(Player).filter(Player.id.in_([a.id, b.id]), Player.team_id.isnot(None)).count() == 0
    assert db.query(TeamSeasonMember).filter_by(team_id=t.id).one().score == 4
    assert client.post(f"/api/v1/admin/teams/{t.id}/dissolve", headers=H).get_json()["code"] == "team_dissolved"


def test_dissolve_all_needs_confirmation_and_no_running_team_season(client, db):
    teams = [f.team(db), f.team(db)]
    f.player(db, team=teams[0])
    team_season = f.season(db)

    assert client.post("/api/v1/admin/teams/dissolve-all", json={"confirm": "si"}, headers=H).get_json()["code"] == "confirmation_required"
    assert client.post("/api/v1/admin/teams/dissolve-all", json={"confirm": "DISOLVER"}, headers=H).get_json()["code"] == "season_locked"

    team_season.is_active = False
    db.commit()
    response = client.post("/api/v1/admin/teams/dissolve-all", json={"confirm": "DISOLVER"}, headers=H)

    assert response.get_json() == {"dissolved": 2}
    assert {t.dissolved_reason for t in db.query(Team).all()} == {"admin_bulk"}
