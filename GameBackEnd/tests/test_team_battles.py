"""Battles in team seasons: rules (RN-70..72) and point attribution (RN-73)."""

import pytest

from db.models import Battle, Boss, PlayerHistoryEntry, PlayerSeasonStats, ProtectedWord, TeamSeasonMember
import factories as f


def _start(client, headers, fortress_id):
    return client.post("/api/v1/battles", json={"fortress_id": fortress_id}, headers=headers)


def _win(client, headers, fortress, word):
    battle_id = _start(client, headers, fortress.id).get_json()["battle_id"]
    client.post(f"/api/v1/battles/{battle_id}/message", json={"message": "hola"}, headers=headers)
    return client.post(f"/api/v1/battles/{battle_id}/guess", json={"word": word}, headers=headers)


def _individual(db, season, player):
    return db.query(PlayerSeasonStats).filter_by(season_id=season.id, player_id=player.id).one().score


def _team_points(db, season, team, player=None):
    q = db.query(TeamSeasonMember).filter_by(season_id=season.id, team_id=team.id)
    if player is not None:
        q = q.filter_by(player_id=player.id)
    return sum(row.score for row in q.all())


@pytest.fixture
def teams(db):
    """A running team season with two teams of two players."""
    s = f.season(db, mode="team")
    red, blue = f.team(db, "Red"), f.team(db, "Blue")
    players = {
        "r1": f.player(db, "r1", team=red, word="RUBY", season_obj=s),
        "r2": f.player(db, "r2", team=red, word="GARNET", season_obj=s),
        "b1": f.player(db, "b1", team=blue, word="SAPPHIRE", season_obj=s),
        "loner": f.player(db, "loner", word="ONYX", season_obj=s),
        "bot": f.player(db, "bot", is_bot=True, word="BOLT", season_obj=s),
    }
    return s, red, blue, players


# ── Rules ─────────────────────────────────────────────────

@pytest.mark.parametrize("attacker, target, code", [
    ("loner", "b1", "team_required"),
    ("r1", "r2", "same_team"),
    ("r1", "loner", "target_not_participating"),
])
def test_start_battle_rejects_team_rule_violations(app, client, teams, attacker, target, code):
    _, _, _, p = teams

    response = _start(client, f.auth(app, p[attacker]), p[target].fortress.id)

    assert (response.status_code, response.get_json()["code"]) == (403, code)


def test_other_teams_and_bots_can_be_attacked(app, client, teams):
    _, _, _, p = teams
    headers = f.auth(app, p["r1"])

    assert _start(client, headers, p["b1"].fortress.id).status_code == 201
    assert _start(client, headers, p["bot"].fortress.id).status_code == 201


def test_boss_battles_require_a_team(app, client, db, teams):
    _, _, _, p = teams
    boss = Boss(name="Boss", story="s", prompt="p", protected_word="KING")
    db.add(boss)
    db.add(ProtectedWord(word="CROWN"))
    db.commit()

    loner = client.post("/api/v1/battles/boss", json={"boss_id": boss.id}, headers=f.auth(app, p["loner"]))
    member = client.post("/api/v1/battles/boss", json={"boss_id": boss.id}, headers=f.auth(app, p["r1"]))

    assert (loner.status_code, loner.get_json()["code"]) == (403, "team_required")
    assert member.status_code == 201


def test_individual_seasons_keep_the_old_rules(app, client, db):
    f.season(db, mode="individual")
    t = f.team(db)
    a, b = f.player(db, team=t), f.player(db, team=t)
    loner = f.player(db)

    assert _start(client, f.auth(app, a), b.fortress.id).status_code == 201       # teammates
    assert _start(client, f.auth(app, loner), a.fortress.id).status_code == 201   # without team


# ── Points ────────────────────────────────────────────────

def test_win_points_go_to_the_attacker_and_their_team(app, client, db, teams):
    s, red, _, p = teams

    response = _win(client, f.auth(app, p["r1"]), p["b1"].fortress, "SAPPHIRE")

    assert response.get_json()["score_awarded"] == 5
    assert _individual(db, s, p["r1"]) == 5
    assert _team_points(db, s, red, p["r1"]) == 5
    entry = db.query(PlayerHistoryEntry).filter_by(player_id=p["r1"].id, type="points").one()
    assert entry.team_id == red.id


def test_beating_a_bot_scores_for_the_team(app, client, db, teams):
    s, red, _, p = teams

    _win(client, f.auth(app, p["r1"]), p["bot"].fortress, "BOLT")

    assert _team_points(db, s, red) == 5


def test_defense_points_go_to_the_defender_team(app, client, db, teams):
    s, red, blue, p = teams
    headers = f.auth(app, p["r1"])
    battle_id = _start(client, headers, p["b1"].fortress.id).get_json()["battle_id"]
    client.post(f"/api/v1/battles/{battle_id}/message", json={"message": "hola"}, headers=headers)

    response = client.post(f"/api/v1/battles/{battle_id}/guess", json={"word": "WRONG"}, headers=headers)

    assert response.get_json()["result"] == "defense"
    assert _team_points(db, s, blue, p["b1"]) == 1
    assert _team_points(db, s, red) == 0


def test_points_stay_with_the_team_they_were_earned_for(app, client, db, teams):
    s, red, blue, p = teams
    third = f.team(db, "Green")
    target = f.player(db, "g1", team=third, word="EMERALD", season_obj=s)
    target2 = f.player(db, "g2", team=third, word="JADE", season_obj=s)

    _win(client, f.auth(app, p["r1"]), target.fortress, "EMERALD")   # +5 for Red
    p["r1"].team_id = blue.id                                        # admin moves r1 to Blue
    db.commit()
    _win(client, f.auth(app, p["r1"]), target2.fortress, "JADE")     # +5 for Blue (another unbeaten fortress)

    assert _team_points(db, s, red, p["r1"]) == 5
    assert _team_points(db, s, blue, p["r1"]) == 5
    assert _individual(db, s, p["r1"]) == 10


def test_individual_season_points_do_not_touch_teams(app, client, db):
    s = f.season(db, mode="individual")
    t = f.team(db)
    a = f.player(db, team=t, season_obj=s)
    b = f.player(db, word="TOPAZ", season_obj=s)

    _win(client, f.auth(app, a), b.fortress, "TOPAZ")

    assert _individual(db, s, a) == 5
    assert db.query(TeamSeasonMember).count() == 0
    assert db.query(PlayerHistoryEntry).filter_by(type="points").one().team_id is None


# ── Invalidation (RN-72) ─────────────────────────────────

def test_battle_is_invalidated_when_the_target_becomes_a_teammate(app, client, db, teams):
    s, red, _, p = teams
    headers = f.auth(app, p["r1"])
    battle_id = _start(client, headers, p["b1"].fortress.id).get_json()["battle_id"]
    client.post(f"/api/v1/battles/{battle_id}/message", json={"message": "hola"}, headers=headers)

    p["b1"].team_id = red.id  # admin moves the defender into the attacker's team
    db.commit()
    response = client.post(f"/api/v1/battles/{battle_id}/guess", json={"word": "SAPPHIRE"}, headers=headers)

    assert response.status_code == 409
    assert response.get_json() | {"error": None} == {"error": None, "code": "battle_invalidated", "reason": "same_team"}
    db.expire_all()
    assert db.get(Battle, battle_id).status == "expired"
    assert _individual(db, s, p["r1"]) == 0


def test_message_is_rejected_after_the_attacker_loses_the_team(app, client, db, teams):
    _, _, _, p = teams
    headers = f.auth(app, p["r1"])
    battle_id = _start(client, headers, p["b1"].fortress.id).get_json()["battle_id"]

    p["r1"].team_id = None  # admin removes the attacker from the team
    db.commit()
    response = client.post(f"/api/v1/battles/{battle_id}/message", json={"message": "hola"}, headers=headers)

    assert (response.status_code, response.get_json()["reason"]) == (409, "team_required")


def test_resuming_a_battle_that_breaks_the_rules_expires_it(app, client, db, teams):
    _, red, _, p = teams
    headers = f.auth(app, p["r1"])
    battle_id = _start(client, headers, p["b1"].fortress.id).get_json()["battle_id"]

    p["b1"].team_id = red.id
    db.commit()
    response = _start(client, headers, p["b1"].fortress.id)

    assert response.get_json()["code"] == "same_team"
    db.expire_all()
    assert db.get(Battle, battle_id).status == "expired"
