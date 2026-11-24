"""Team endpoints for players (RN-01..42)."""

from db.models import ActivityLog, Player, Team, TeamMembershipLog, TeamSeasonMember
import factories as f


def _me(client, headers):
    response = client.get("/api/v1/teams/me", headers=headers)
    assert response.status_code == 200
    return response.get_json()


# ── Create ────────────────────────────────────────────────

def test_create_team_makes_me_its_first_member(app, client, db):
    alice = f.player(db, "alice")
    headers = f.auth(app, alice)

    response = client.post("/api/v1/teams", json={"name": "  Red Lancers "}, headers=headers)

    assert response.status_code == 201
    body = response.get_json()
    assert body["team"]["name"] == "Red Lancers"
    assert len(body["team"]["join_code"]) == 8
    assert [m["username"] for m in body["team"]["members"]] == ["alice"]
    assert body["team"]["members"][0]["joined_at"] is not None
    assert body["can_create"] is False and body["can_join"] is False
    assert body["can_manage"] is True and body["can_leave"] is True
    team = db.query(Team).one()
    assert team.created_by_player_id == alice.id
    assert {e.event for e in db.query(TeamMembershipLog).all()} == {"created", "joined"}
    assert db.query(ActivityLog).filter_by(type="team_created").count() == 1


def test_me_without_team(app, client, db):
    body = _me(client, f.auth(app, f.player(db)))

    assert body["team"] is None
    assert body["can_create"] is True and body["can_join"] is True
    assert body["max_size"] == 5
    assert body["team_season_running"] is False


def test_create_rejects_invalid_and_taken_names(app, client, db):
    f.team(db, "Los Hackers")
    headers = f.auth(app, f.player(db))

    invalid = client.post("/api/v1/teams", json={"name": "a!"}, headers=headers)
    taken = client.post("/api/v1/teams", json={"name": "los hackérs"}, headers=headers)

    assert (invalid.status_code, invalid.get_json()["code"]) == (400, "invalid_name")
    assert (taken.status_code, taken.get_json()["code"]) == (409, "name_taken")


def test_name_of_a_dissolved_team_is_free_again(app, client, db):
    f.team(db, "Phoenix", dissolved=True)

    response = client.post("/api/v1/teams", json={"name": "Phoenix"}, headers=f.auth(app, f.player(db)))

    assert response.status_code == 201


def test_cannot_create_when_disabled_or_already_in_team(app, client, db):
    t = f.team(db)
    member = f.player(db, team=t)

    assert client.post("/api/v1/teams", json={"name": "Second"}, headers=f.auth(app, member)).get_json()["code"] == "already_in_team"

    f.set_config(db, team_creation_enabled=False)
    response = client.post("/api/v1/teams", json={"name": "Blocked"}, headers=f.auth(app, f.player(db)))
    assert (response.status_code, response.get_json()["code"]) == (403, "team_creation_disabled")


def test_creating_during_a_team_season_adds_the_roster_row(app, client, db):
    s = f.season(db, mode="team")
    alice = f.player(db)

    client.post("/api/v1/teams", json={"name": "Late Team"}, headers=f.auth(app, alice))

    row = db.query(TeamSeasonMember).one()
    assert (row.season_id, row.player_id, row.score) == (s.id, alice.id, 0)


# ── Join ──────────────────────────────────────────────────

def test_join_with_code_until_full(app, client, db):
    f.set_config(db, team_max_size=2)
    t = f.team(db)
    f.player(db, team=t)
    bob, carol = f.player(db, "bob"), f.player(db, "carol")

    joined = client.post("/api/v1/teams/join", json={"code": f" {t.join_code.lower()} "}, headers=f.auth(app, bob))
    full = client.post("/api/v1/teams/join", json={"code": t.join_code}, headers=f.auth(app, carol))

    assert joined.status_code == 200
    assert joined.get_json()["team"]["member_count"] == 2
    assert (full.status_code, full.get_json()["code"]) == (409, "team_full")
    assert db.query(ActivityLog).filter_by(type="team_joined").count() == 1


def test_join_rejects_bad_dissolved_and_disabled_codes(app, client, db):
    old = f.team(db, dissolved=True)
    headers = f.auth(app, f.player(db))

    assert client.post("/api/v1/teams/join", json={"code": "NOPE2345"}, headers=headers).get_json()["code"] == "invalid_code"
    assert client.post("/api/v1/teams/join", json={"code": old.join_code}, headers=headers).status_code == 404

    f.set_config(db, team_joining_enabled=False)
    live = f.team(db)
    response = client.post("/api/v1/teams/join", json={"code": live.join_code}, headers=headers)
    assert (response.status_code, response.get_json()["code"]) == (403, "team_joining_disabled")


def test_teams_over_the_lowered_max_accept_nobody(app, client, db):
    t = f.team(db)
    for _ in range(3):
        f.player(db, team=t)
    f.set_config(db, team_max_size=2)

    response = client.post("/api/v1/teams/join", json={"code": t.join_code}, headers=f.auth(app, f.player(db)))

    assert response.get_json()["code"] == "team_full"
    assert db.query(Player).filter_by(team_id=t.id).count() == 3  # existing members are kept (D13)


def test_bots_cannot_join(app, client, db):
    t = f.team(db)
    bot = f.player(db, is_bot=True)

    response = client.post("/api/v1/teams/join", json={"code": t.join_code}, headers=f.auth(app, bot))

    assert (response.status_code, response.get_json()["code"]) == (403, "bots_cannot_join")


def test_joining_during_a_team_season_adds_the_roster_row(app, client, db):
    s = f.season(db, mode="team")
    t = f.team(db)
    bob = f.player(db)

    client.post("/api/v1/teams/join", json={"code": t.join_code}, headers=f.auth(app, bob))

    assert db.query(TeamSeasonMember).filter_by(team_id=t.id, season_id=s.id, player_id=bob.id).count() == 1


def test_joining_during_an_individual_season_adds_no_roster_row(app, client, db):
    f.season(db, mode="individual")
    t = f.team(db)

    client.post("/api/v1/teams/join", json={"code": t.join_code}, headers=f.auth(app, f.player(db)))

    assert db.query(TeamSeasonMember).count() == 0


def test_preview(app, client, db):
    f.set_config(db, team_max_size=2)
    t = f.team(db, "Preview Team")
    f.player(db, team=t)
    headers = f.auth(app, f.player(db))

    body = client.get(f"/api/v1/teams/preview?code={t.join_code}", headers=headers).get_json()

    assert body == {"name": "Preview Team", "member_count": 1, "max_size": 2, "is_full": False}
    assert client.get("/api/v1/teams/preview?code=XXXXXXXX", headers=headers).status_code == 404


def test_code_attempts_are_rate_limited_per_player(app, client, db):
    headers = f.auth(app, f.player(db))

    statuses = [client.post("/api/v1/teams/join", json={"code": "ZZZZZZZZ"}, headers=headers).status_code for _ in range(10)]
    statuses.append(client.get("/api/v1/teams/preview?code=ZZZZZZZZ", headers=headers).status_code)

    assert statuses[:10] == [404] * 10
    assert statuses[10] == 429  # preview shares the limit with join

    other = client.post("/api/v1/teams/join", json={"code": "ZZZZZZZZ"}, headers=f.auth(app, f.player(db)))
    assert other.status_code == 404  # another player is not affected


def test_team_endpoints_require_auth(client):
    assert client.get("/api/v1/teams/me").status_code == 401
    assert client.post("/api/v1/teams", json={"name": "x"}).status_code == 401


# ── Leave ─────────────────────────────────────────────────

def test_leave_and_last_member_dissolves_the_team(app, client, db):
    t = f.team(db)
    alice, bob = f.player(db, team=t), f.player(db, team=t)

    first = client.post("/api/v1/teams/me/leave", headers=f.auth(app, alice))
    db.refresh(t)
    assert first.status_code == 200 and first.get_json()["team"] is None
    assert t.dissolved_at is None

    client.post("/api/v1/teams/me/leave", headers=f.auth(app, bob))
    db.refresh(t)
    assert (t.dissolved_reason, t.dissolved_at is not None) == ("empty", True)


def test_cannot_leave_during_a_team_season(app, client, db):
    f.season(db, mode="team", is_frozen=True)  # frozen still counts as running
    alice = f.player(db, team=f.team(db))
    headers = f.auth(app, alice)

    response = client.post("/api/v1/teams/me/leave", headers=headers)

    assert (response.status_code, response.get_json()["code"]) == (409, "season_locked")
    body = _me(client, headers)
    assert body["can_leave"] is False and body["leave_blocked_reason"] == "season_locked"


def test_leave_rules_outside_team_seasons(app, client, db):
    f.season(db, mode="individual")
    alice = f.player(db, team=f.team(db))
    loner = f.player(db)

    assert client.post("/api/v1/teams/me/leave", headers=f.auth(app, loner)).get_json()["code"] == "not_in_team"

    f.set_config(db, team_leaving_enabled=False)
    response = client.post("/api/v1/teams/me/leave", headers=f.auth(app, alice))
    assert (response.status_code, response.get_json()["code"]) == (403, "team_leaving_disabled")


# ── Manage ────────────────────────────────────────────────

def test_any_member_can_rename_and_regenerate_the_code(app, client, db):
    t = f.team(db, "Old Name")
    old_code = t.join_code
    headers = f.auth(app, f.player(db, team=t))

    renamed = client.patch("/api/v1/teams/me", json={"name": "New Name"}, headers=headers)
    regenerated = client.post("/api/v1/teams/me/regenerate-code", headers=headers)

    assert renamed.get_json()["team"]["name"] == "New Name"
    new_code = regenerated.get_json()["team"]["join_code"]
    assert new_code != old_code
    joiner = f.auth(app, f.player(db))
    assert client.post("/api/v1/teams/join", json={"code": old_code}, headers=joiner).status_code == 404
    events = [e.event for e in db.query(TeamMembershipLog).filter_by(team_id=t.id)]
    assert "renamed" in events and "code_regenerated" in events


def test_rename_to_a_taken_name(app, client, db):
    f.team(db, "Taken")
    headers = f.auth(app, f.player(db, team=f.team(db, "Mine")))

    assert client.patch("/api/v1/teams/me", json={"name": "TAKEN"}, headers=headers).get_json()["code"] == "name_taken"
    assert client.patch("/api/v1/teams/me", json={"name": "mine"}, headers=headers).status_code == 200  # own name, other case


def test_self_management_disabled(app, client, db):
    f.set_config(db, team_self_management_enabled=False)
    headers = f.auth(app, f.player(db, team=f.team(db)))

    assert _me(client, headers)["can_manage"] is False
    for response in (
        client.patch("/api/v1/teams/me", json={"name": "Nope"}, headers=headers),
        client.post("/api/v1/teams/me/regenerate-code", headers=headers),
    ):
        assert (response.status_code, response.get_json()["code"]) == (403, "self_management_disabled")


def test_profile_includes_the_team(app, client, db):
    f.season(db, mode="individual")
    t = f.team(db, "Profile Team")
    headers = f.auth(app, f.player(db, team=t))

    assert client.get("/api/v1/players/me", headers=headers).get_json()["team"] == {"id": t.id, "name": "Profile Team"}
