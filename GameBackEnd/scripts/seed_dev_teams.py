"""
Dev-only seed: example teams and a finalized team season (docs/specs/teams.md §12.3).

The main seed only creates NPC players (is_bot = TRUE) and bots cannot join teams,
so this script adds human test players. They would show up in real rankings, which
is why it is NOT part of seed.py (that one may run in production with SEED_DB=true)
and refuses to run against anything but SQLite unless --force is given.

Creates (idempotent, skips whatever already exists):
  - 7 human dev players (dev_*@dev.local) with fortress, words and a login code
  - Teams: "Lanceros Rojos" (3), "Guardianes Azules" (2), "Sombras del Norte" (dissolved)
  - dev_gala stays without team
  - A finalized team season with team points, so team rankings have history

Usage (from GameBackEnd/, after scripts/seed.py):
    python scripts/seed_dev_teams.py
"""

import sys
import os
import random
import secrets
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from werkzeug.security import generate_password_hash
from db import SessionLocal, engine
from db.models import (
    Archetype,
    Fortress,
    InvitationCode,
    Personality,
    Player,
    PlayerSeasonStats,
    PlayerWord,
    Protocol,
    ProtectedWord,
    Season,
    Team,
    TeamMembershipLog,
    TeamSeasonMember,
)
from services.teams import generate_unique_join_code, normalize_name

DEV_EMAIL_DOMAIN = "dev.local"
DEV_SEASON_NAME = "Temporada por equipos (dev)"

DEV_PLAYERS = [
    # username, first_name, last_name, job_title
    ("dev_ana", "Ana", "Prueba", "Developer"),
    ("dev_bruno", "Bruno", "Prueba", "QA Engineer"),
    ("dev_carla", "Carla", "Prueba", "Architect"),
    ("dev_diego", "Diego", "Prueba", "Developer"),
    ("dev_elena", "Elena", "Prueba", "Product Owner"),
    ("dev_fran", "Fran", "Prueba", "Security Engineer"),
    ("dev_gala", "Gala", "Prueba", "Designer"),
]

# name -> (current members, past-season scores {username: points}, dissolved)
DEV_TEAMS = {
    "Lanceros Rojos": (["dev_ana", "dev_bruno", "dev_carla"], {"dev_ana": 21, "dev_bruno": 9, "dev_carla": 14}, False),
    "Guardianes Azules": (["dev_diego", "dev_elena"], {"dev_diego": 18, "dev_elena": 12}, False),
    "Sombras del Norte": ([], {"dev_fran": 16}, True),
}


def _ensure_dev_players(db, login_codes):
    protocol = db.query(Protocol).order_by(Protocol.unlock_cost, Protocol.id).first()
    archetype = db.query(Archetype).order_by(Archetype.unlock_cost, Archetype.id).first()
    personality = db.query(Personality).order_by(Personality.id).first()
    words = db.query(ProtectedWord).all()
    if not (protocol and archetype and personality and words):
        sys.exit("Run scripts/seed.py first: protocols, archetypes, personalities and words are missing.")

    players = {}
    for username, first_name, last_name, job_title in DEV_PLAYERS:
        player = db.query(Player).filter_by(username=username).first()
        if player:
            print(f"  SKIP  Player '{username}' ya existe")
            players[username] = player
            continue

        player = Player(
            username=username,
            email=f"{username}@{DEV_EMAIL_DOMAIN}",
            first_name=first_name,
            last_name=last_name,
            job_title=job_title,
            password_hash=generate_password_hash(secrets.token_hex(32)),
            credits=200,
        )
        db.add(player)
        db.flush()

        chosen = random.sample(words, min(10, len(words)))
        for word in chosen:
            db.add(PlayerWord(player_id=player.id, word_id=word.id))

        db.add(Fortress(
            owner_id=player.id,
            protocol_id=protocol.id,
            archetype_id=archetype.id,
            personality_id=personality.id,
            name=f"Bastión de {first_name}",
            story=f"Fortaleza de pruebas de {first_name}.",
            protected_word=chosen[0].word,
        ))

        code = secrets.token_urlsafe(12)
        db.add(InvitationCode(
            code=code,
            player_id=player.id,
            is_active=False,
            max_uses=1,
            current_uses=1,
            created_by="seed_dev_teams",
            tag="dev",
            last_used_at=datetime.utcnow(),
        ))
        login_codes.append((username, code))
        players[username] = player
        print(f"  OK    Player '{username}' creado")
    db.flush()
    return players


def _ensure_past_team_season(db):
    season = db.query(Season).filter_by(name=DEV_SEASON_NAME).first()
    if season:
        print(f"  SKIP  Temporada '{DEV_SEASON_NAME}' ya existe")
        return season, False

    start = datetime.utcnow() - timedelta(days=30)
    season = Season(
        name=DEV_SEASON_NAME,
        mode="team",
        is_active=False,
        is_ranked=False,
        is_frozen=False,
        finalized=True,
        start_date=start,
        end_date=start + timedelta(days=14),
        first_activated_at=start,
    )
    db.add(season)
    db.flush()
    print(f"  OK    Temporada '{DEV_SEASON_NAME}' creada (finalizada)")
    return season, True


def _ensure_teams(db, players, season, season_is_new):
    joined_at = season.start_date
    for name, (members, past_scores, dissolved) in DEV_TEAMS.items():
        normalized = normalize_name(name)
        team = db.query(Team).filter_by(name_normalized=normalized).first()
        if team:
            print(f"  SKIP  Team '{name}' ya existe")
            continue

        team = Team(
            name=name,
            name_normalized=normalized,
            join_code=generate_unique_join_code(db),
            created_at=joined_at,
            created_by_player_id=players[next(iter(past_scores))].id,
        )
        db.add(team)
        db.flush()
        db.add(TeamMembershipLog(
            team_id=team.id, event="created", actor="player",
            actor_player_id=team.created_by_player_id, created_at=joined_at,
        ))

        for username in set(members) | set(past_scores):
            player = players[username]
            db.add(TeamMembershipLog(
                team_id=team.id, player_id=player.id, event="joined", actor="player",
                actor_player_id=player.id, created_at=joined_at,
            ))
            if username in members:
                player.team_id = team.id

        if season_is_new:
            for username, score in past_scores.items():
                player = players[username]
                db.add(TeamSeasonMember(
                    team_id=team.id, season_id=season.id, player_id=player.id,
                    score=score, joined_at=joined_at,
                ))
                db.add(PlayerSeasonStats(player_id=player.id, season_id=season.id, score=score))

        if dissolved:
            team.dissolved_at = season.end_date + timedelta(days=1)
            team.dissolved_reason = "admin"
            for username in past_scores:
                db.add(TeamMembershipLog(
                    team_id=team.id, player_id=players[username].id, event="removed",
                    actor="admin", detail="team_dissolved", created_at=team.dissolved_at,
                ))
            db.add(TeamMembershipLog(
                team_id=team.id, event="dissolved", actor="admin", created_at=team.dissolved_at,
            ))

        state = "disuelto" if dissolved else f"{len(members)} miembro(s), código {team.join_code}"
        print(f"  OK    Team '{name}' creado ({state})")


def run(force: bool = False):
    if engine.dialect.name != "sqlite" and not force:
        sys.exit("seed_dev_teams only runs against SQLite (dev). Use --force to override.")

    db = SessionLocal()
    login_codes = []
    try:
        print("[dev teams] Jugadores de prueba...")
        players = _ensure_dev_players(db, login_codes)
        print("[dev teams] Temporada por equipos pasada...")
        season, season_is_new = _ensure_past_team_season(db)
        print("[dev teams] Equipos...")
        _ensure_teams(db, players, season, season_is_new)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    if login_codes:
        print("\nCódigos de acceso de los jugadores de prueba (usuario + código en /login):")
        for username, code in login_codes:
            print(f"  [{username:10}] {code}")
    print("[dev teams] Done.")


if __name__ == "__main__":
    run(force="--force" in sys.argv[1:])
