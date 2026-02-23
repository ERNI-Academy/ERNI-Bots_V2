from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from db import SessionLocal
from db.models import (
    Fortress,
    Player,
    Protocol,
    Archetype,
    Season,
    FortressSeasonStats,ActivityLog
)

from utils import generate_uuid

fortresses_bp = Blueprint("fortresses", __name__)


# ==========================
# Helpers
# ==========================

def get_active_season(db):
    return db.query(Season).filter_by(is_active=True).first()


def get_or_create_fortress_season_stats(db, fortress_id, season_id):
    stats = db.query(FortressSeasonStats).filter_by(
        fortress_id=fortress_id,
        season_id=season_id
    ).first()

    if not stats:
        stats = FortressSeasonStats(
            id=generate_uuid(),
            fortress_id=fortress_id,
            season_id=season_id,
            defeat_count=0,
            attack_count=0,
            status="active"
        )
        db.add(stats)
        db.commit()

    return stats


# ==========================
# CREATE FORTRESS
# ==========================

@fortresses_bp.post("")
@jwt_required()
def create_fortress():
    user_id = get_jwt_identity()
    data = request.json

    name = data.get("name")
    story = data.get("story")
    protocol_id = data.get("protocol_id")
    archetype_id = data.get("archetype_id")
    personality = data.get("personality")
    constraints = data.get("constraints")
    protected_word = data.get("protected_word")

    if not all([name, story, protocol_id, archetype_id, personality, protected_word]):
        return jsonify({"error": "Missing required fields"}), 400

    db = SessionLocal()

    player = db.query(Player).filter_by(id=user_id).first()
    if not player:
        db.close()
        return jsonify({"error": "Player not found"}), 404

    # Check if player already has a fortress
    existing_fortress = db.query(Fortress).filter_by(owner_id=user_id).first()
    if existing_fortress:
        db.close()
        return jsonify({"error": "Player already has a fortress"}), 400

    protocol = db.query(Protocol).filter_by(id=protocol_id).first()
    archetype = db.query(Archetype).filter_by(id=archetype_id).first()

    if not protocol or not archetype:
        db.close()
        return jsonify({"error": "Invalid protocol or archetype"}), 400
    
    # DESBLOQUEO POR CREDITS
    total_cost = protocol.unlock_cost + archetype.unlock_cost

    if player.credits < total_cost:
        db.close()
        return jsonify({"error": "Not enough credits"}), 403

  
    player.credits -= total_cost

    fortress = Fortress(
        id=generate_uuid(),
        owner_id=user_id,
        protocol_id=protocol_id,
        archetype_id=archetype_id,
        name=name,
        story=story,
        personality=personality,
        constraints=constraints or "",
        protected_word=protected_word,
        created_at=datetime.utcnow(),
        last_reconfigured_at=datetime.utcnow()
    )

    db.add(fortress)
    log = ActivityLog(
        type="fortress_create",
        actor_id=player.id,
        message=f"{player.username} ha entrado en el escenario con una nueva y flamante ciudadela."
    )

    db.add(log)
    db.commit()
    db.refresh(fortress)
    db.close()

    return jsonify({"fortress_id": fortress.id}), 201


# ==========================
# LIST PLAYER FORTRESSES
# ==========================

@fortresses_bp.get("/me")
@jwt_required()
def get_my_fortress():
    user_id = get_jwt_identity()
    db = SessionLocal()

    fortress = db.query(Fortress).filter_by(owner_id=user_id).first()

    if not fortress:
        db.close()
        return jsonify({"error": "No fortress found"}), 404

    result = {
        "id": fortress.id,
        "name": fortress.name,
        "protocol": fortress.protocol.name,
        "archetype": fortress.archetype.name,
        "created_at": fortress.created_at
    }

    db.close()
    return jsonify(result)


# ==========================
# RECONFIGURE FORTRESS
# ==========================

@fortresses_bp.put("/<fortress_id>/reconfigure")
@jwt_required()
def reconfigure_fortress(fortress_id):
    user_id = get_jwt_identity()
    data = request.json

    db = SessionLocal()

    season = get_active_season(db)
    if not season or season.is_frozen:
        db.close()
        return jsonify({"error": "Season not active"}), 403

    fortress = db.query(Fortress).filter_by(id=fortress_id).first()

    if not fortress or fortress.owner_id != user_id:
        db.close()
        return jsonify({"error": "Not authorized"}), 403

    stats = get_or_create_fortress_season_stats(
        db, fortress.id, season.id
    )

    if stats.defeat_count < 3:
        db.close()
        return jsonify({"error": "Not eligible for reconfiguration"}), 403

    # COSTE DINÁMICO
    base_cost = 100
    extra = stats.defeat_count - 3
    discount = extra * 10
    cost = max(20, base_cost - discount)

    player = db.query(Player).filter_by(id=user_id).first()

    if player.credits < cost:
        db.close()
        return jsonify({"error": "Not enough credits"}), 403

    player.credits -= cost

    # Actualización
    fortress.protocol_id = data.get("protocol_id", fortress.protocol_id)
    fortress.archetype_id = data.get("archetype_id", fortress.archetype_id)
    fortress.personality = data.get("personality", fortress.personality)
    fortress.constraints = data.get("constraints", fortress.constraints)
    fortress.protected_word = data.get("protected_word", fortress.protected_word)

    fortress.last_reconfigured_at = datetime.utcnow()
    log = ActivityLog(
        type="fortress_reconfigured",
        actor_id=player.id,
        message=f"{player.username} ha reconfigurado su fortaleza"
    )

    db.add(log)
    stats.defeat_count = 0
    stats.status = "active"

    db.commit()
    db.close()

    return jsonify({"message": "Fortress reconfigured", "cost": cost})


# ==========================
# REBUILD DESTROYED FORTRESS
# ==========================

@fortresses_bp.post("/<fortress_id>/rebuild")
@jwt_required()
def rebuild_fortress(fortress_id):
    user_id = get_jwt_identity()

    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    fortress = db.query(Fortress).filter_by(id=fortress_id).first()

    if not fortress or fortress.owner_id != user_id:
        db.close()
        return jsonify({"error": "Not authorized"}), 403

    stats = get_or_create_fortress_season_stats(
        db, fortress.id, season.id
    )

    if stats.status != "destroyed":
        db.close()
        return jsonify({"error": "Fortress is not destroyed"}), 400

    rebuild_cost = 50

    player = db.query(Player).filter_by(id=user_id).first()

    if player.credits < rebuild_cost:
        db.close()
        return jsonify({"error": "Not enough credits"}), 403

    player.credits -= rebuild_cost
    log = ActivityLog(
        type="fortress_rebuilt",
        actor_id=player.id,
        message=f"{player.username} ha reconstruido su fortaleza"
    )

    db.add(log)
    stats.defeat_count = 0
    stats.attack_count = 0
    stats.status = "active"
    fortress.last_reconfigured_at = datetime.utcnow()
    db.commit()
    db.close()
