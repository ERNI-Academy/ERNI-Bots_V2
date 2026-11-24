"""Small builders for AdminPanel test data."""

import itertools
from datetime import datetime

from db.models import AppConfig, Player, Season, Team, TeamSeasonMember
from services.teams import generate_join_code, normalize_name

_seq = itertools.count(1)


def set_config(db, **values):
    for key, value in values.items():
        text_value = ("true" if value else "false") if isinstance(value, bool) else str(value)
        row = db.get(AppConfig, key)
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


def player(db, username=None, team=None, is_bot=False):
    username = username or f"player{next(_seq)}"
    p = Player(username=username, email=f"{username}@test.local", password_hash="x",
               is_bot=is_bot, team_id=team.id if team else None)
    db.add(p)
    db.commit()
    return p


def team(db, name=None, dissolved=False):
    name = name or f"Team {next(_seq)}"
    t = Team(name=name, name_normalized=normalize_name(name), join_code=generate_join_code(),
             dissolved_at=datetime.utcnow() if dissolved else None)
    db.add(t)
    db.commit()
    return t


def roster(db, team_obj, season_obj, player_obj, score=0):
    db.add(TeamSeasonMember(team_id=team_obj.id, season_id=season_obj.id, player_id=player_obj.id, score=score))
    db.commit()
