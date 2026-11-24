"""Small builders for test data."""

import itertools
from datetime import datetime, timedelta

from flask_jwt_extended import create_access_token

from db.models import (
    AppConfig,
    Archetype,
    Fortress,
    Personality,
    Player,
    PlayerSeasonStats,
    Protocol,
    Season,
    Team,
    TeamSeasonMember,
)
from services.teams import generate_join_code, normalize_name

_seq = itertools.count(1)


def set_config(db, **values):
    for key, value in values.items():
        row = db.get(AppConfig, key)
        text_value = ("true" if value else "false") if isinstance(value, bool) else str(value)
        if row:
            row.value = text_value
        else:
            db.add(AppConfig(key=key, value=text_value))
    db.commit()


def season(db, mode="team", active=True, **kwargs):
    s = Season(name=f"Season {next(_seq)}", mode=mode, is_active=active, **kwargs)
    db.add(s)
    db.commit()
    return s


def _catalog(db):
    protocol = db.get(Protocol, "p-test") or Protocol(id="p-test", name="P", description="d", protocol_template="protocol")
    archetype = db.get(Archetype, "a-test") or Archetype(id="a-test", name="A", description="d", archetype_template="archetype")
    personality = db.get(Personality, "x-test") or Personality(id="x-test", name="X", description="d", personality_template="personality")
    db.add_all([protocol, archetype, personality])
    db.flush()
    return protocol, archetype, personality


def player(db, username=None, team=None, is_bot=False, fortress=True, word=None, season_score=None, season_obj=None):
    username = username or f"player{next(_seq)}"
    p = Player(
        username=username,
        email=f"{username}@test.local",
        password_hash="x",
        is_bot=is_bot,
        team_id=team.id if team else None,
    )
    db.add(p)
    db.flush()
    if fortress:
        protocol, archetype, personality = _catalog(db)
        db.add(Fortress(
            owner_id=p.id,
            protocol_id=protocol.id,
            archetype_id=archetype.id,
            personality_id=personality.id,
            name=f"Fortress of {username}",
            story="story",
            protected_word=word or f"WORD{next(_seq)}",
            last_reconfigured_at=datetime.utcnow() - timedelta(days=1),
        ))
    if season_obj is not None:
        db.add(PlayerSeasonStats(player_id=p.id, season_id=season_obj.id, score=season_score or 0))
    db.commit()
    return p


def team(db, name=None, dissolved=False):
    name = name or f"Team {next(_seq)}"
    t = Team(
        name=name,
        name_normalized=normalize_name(name),
        join_code=generate_join_code(),
        dissolved_at=datetime.utcnow() if dissolved else None,
    )
    db.add(t)
    db.commit()
    return t


def roster(db, team_obj, season_obj, player_obj, score=0):
    db.add(TeamSeasonMember(team_id=team_obj.id, season_id=season_obj.id, player_id=player_obj.id, score=score))
    db.commit()


def auth(app, player_obj):
    with app.app_context():
        return {"Authorization": f"Bearer {create_access_token(identity=player_obj.id)}"}
