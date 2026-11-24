"""Matchmaking (RN-75/76), rankings (RN-80..82) and team prizes (RN-90/91)."""

from db.models import Prize
import factories as f


def _matches(client, app, player):
    response = client.get("/api/v1/players/matchmaking", headers=f.auth(app, player))
    assert response.status_code == 200
    return {m["username"]: m for m in response.get_json()}


# ── Matchmaking ───────────────────────────────────────────

def test_team_matchmaking_excludes_teammates_and_players_without_team(app, client, db):
    s = f.season(db, mode="team")
    red, blue = f.team(db, "Red"), f.team(db, "Blue")
    me = f.player(db, "me", team=red, season_obj=s)
    f.player(db, "mate", team=red, season_obj=s)
    f.player(db, "rival", team=blue, season_obj=s)
    f.player(db, "loner", season_obj=s)
    f.player(db, "bot", is_bot=True, season_obj=s)

    matches = _matches(client, app, me)

    assert set(matches) == {"rival", "bot"}
    assert matches["rival"]["team_name"] == "Blue"
    assert matches["bot"]["team_name"] is None


def test_team_matchmaking_hides_bots_when_disabled(app, client, db):
    s = f.season(db, mode="team")
    f.set_config(db, bot_fortresses_enabled=False)
    me = f.player(db, team=f.team(db), season_obj=s)
    f.player(db, "rival", team=f.team(db), season_obj=s)
    f.player(db, "bot", is_bot=True, season_obj=s)

    assert set(_matches(client, app, me)) == {"rival"}


def test_without_team_matchmaking_is_empty(app, client, db):
    s = f.season(db, mode="team")
    loner = f.player(db, season_obj=s)
    f.player(db, "rival", team=f.team(db), season_obj=s)
    f.player(db, "bot", is_bot=True, season_obj=s)

    assert _matches(client, app, loner) == {}


def test_team_matchmaking_ranks_by_team_score(app, client, db):
    s = f.season(db, mode="team")
    mine, near, far = f.team(db, "Mine"), f.team(db, "Near"), f.team(db, "Far")
    me = f.player(db, "me", team=mine, season_obj=s)
    near_player = f.player(db, "near", team=near, season_obj=s, season_score=900)   # far individually...
    far_player = f.player(db, "far", team=far, season_obj=s, season_score=0)        # ...close individually
    f.roster(db, mine, s, me, score=50)
    f.roster(db, near, s, near_player, score=60)   # ...but team scores decide
    f.roster(db, far, s, far_player, score=3000)

    assert set(_matches(client, app, me)) == {"near"}  # 'far' is outside every window (max 1600)


def test_individual_matchmaking_is_unchanged_and_uses_the_active_season_score(app, client, db):
    old = f.season(db, mode="individual", active=False)
    s = f.season(db, mode="individual")
    t = f.team(db)
    me = f.player(db, "me", team=t, season_obj=s)
    mate = f.player(db, "mate", team=t, season_obj=old, season_score=5000)
    from db.models import PlayerSeasonStats
    db.add(PlayerSeasonStats(player_id=mate.id, season_id=s.id, score=7))
    db.commit()
    f.player(db, "loner", season_obj=s)

    matches = _matches(client, app, me)

    assert set(matches) == {"mate", "loner"}
    assert matches["mate"]["season_score"] == 7  # not the 5000 of an older season


# ── Leaderboard ───────────────────────────────────────────

def test_team_leaderboard_is_the_default_in_team_seasons(client, db):
    s = f.season(db, mode="team")
    red, blue, gone = f.team(db, "Red"), f.team(db, "Blue"), f.team(db, "Gone", dissolved=True)
    r1, r2 = f.player(db, team=red), f.player(db, team=red)
    b1 = f.player(db, team=blue)
    ex = f.player(db)
    f.roster(db, red, s, r1, score=4)
    f.roster(db, red, s, r2, score=6)
    f.roster(db, blue, s, b1, score=10)
    f.roster(db, gone, s, ex, score=12)
    f.team(db, "No Rows")

    body = client.get("/api/v1/leaderboard").get_json()

    assert body["type"] == "teams" and body["season_mode"] == "team"
    assert [(i["rank"], i["name"], i["score"], i["member_count"], i["dissolved"]) for i in body["items"]] == [
        (1, "Gone", 12, 0, True),
        (2, "Blue", 10, 1, False),   # tie with Red, broken by name
        (3, "Red", 10, 2, False),
    ]
    assert body["total"] == 3


def test_player_leaderboard_in_team_seasons_shows_the_team(client, db):
    s = f.season(db, mode="team")
    f.player(db, "alice", team=f.team(db, "Red"), season_obj=s, season_score=5)
    f.player(db, "bob", season_obj=s, season_score=2)

    body = client.get("/api/v1/leaderboard?type=players").get_json()

    assert [(i["username"], i["team_name"]) for i in body["items"]] == [("alice", "Red"), ("bob", None)]


def test_team_leaderboard_needs_a_team_season(client, db):
    s = f.season(db, mode="individual")
    f.player(db, "alice", season_obj=s, season_score=5)

    default = client.get("/api/v1/leaderboard").get_json()
    teams = client.get("/api/v1/leaderboard?type=teams")

    assert default["type"] == "players" and "team_name" not in default["items"][0]
    assert (teams.status_code, teams.get_json()["code"]) == (400, "not_team_season")
    assert client.get("/api/v1/leaderboard?type=nope").status_code == 400


def test_team_detail_lists_contributions(client, db):
    s = f.season(db, mode="team")
    red = f.team(db, "Red")
    a = f.player(db, "alice", team=red)
    gone = f.player(db, "gone")  # contributed, then left
    f.roster(db, red, s, a, score=3)
    f.roster(db, red, s, gone, score=8)

    body = client.get(f"/api/v1/leaderboard/teams/{red.id}").get_json()

    assert body["score"] == 11
    assert body["members"] == [
        {"username": "gone", "score": 8, "current_member": False},
        {"username": "alice", "score": 3, "current_member": True},
    ]
    assert client.get(f"/api/v1/leaderboard/teams/{f.team(db).id}").status_code == 404


# ── Prizes ────────────────────────────────────────────────

def test_prizes_show_the_winning_team_and_its_members(client, db):
    red = f.team(db, "Red")
    f.player(db, "bob", team=red)
    f.player(db, "alice", team=red)
    db.add(Prize(name="Campeones", winner_team_id=red.id))
    db.add(Prize(name="MVP", winner_username="carol", sort_order=1))
    db.commit()

    prizes = {p["name"]: p for p in client.get("/api/v1/prizes/").get_json()}

    assert prizes["Campeones"]["winner_team"] == {"name": "Red", "members": ["alice", "bob"]}
    assert prizes["MVP"]["winner_team"] is None
    assert prizes["MVP"]["winner_username"] == "carol"


def test_matchmaking_includes_players_and_bots_without_stats_this_season(app, client, db):
    """A fresh season has no stats rows yet: bots and idle players must still be attackable."""
    s = f.season(db, mode="individual")
    me = f.player(db, "me", season_obj=s)
    f.player(db, "idle")                # no PlayerSeasonStats row in this season
    f.player(db, "npc", is_bot=True)    # bots never open their profile

    matches = _matches(client, app, me)

    assert set(matches) == {"idle", "npc"}
    assert matches["idle"]["season_score"] == 0
