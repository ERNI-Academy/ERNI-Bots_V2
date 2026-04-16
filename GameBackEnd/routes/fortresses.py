from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from db import SessionLocal
from db.models import (
    Fortress,
    Player,
    Protocol,
    Archetype,
    Personality,
    Season,
    FortressSeasonStats,
    ActivityLog,
    GameConstraint,
    FortressConstraint,
    AssetType,
    PlayerAsset,
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
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(stats)
        db.flush()

    return stats


def asset_cost(db, player_id: str, asset_type_name: str, asset_id: str, base_cost: int) -> int:
    """Return base_cost unless the player already owns the asset in the store."""
    if base_cost == 0:
        return 0
    at = db.query(AssetType).filter_by(name=asset_type_name).first()
    if not at:
        return base_cost
    owned = db.query(PlayerAsset).filter_by(
        player_id=player_id, asset_type_id=at.id, asset_id=asset_id
    ).first()
    return 0 if owned else base_cost


def player_owns_or_free(db, player_id: str, asset_type_name: str, asset_id: str, base_cost: int) -> bool:
    """Return True if asset is free (base_cost==0) or the player owns it in the store."""
    if base_cost == 0:
        return True
    at = db.query(AssetType).filter_by(name=asset_type_name).first()
    if not at:
        return False
    return db.query(PlayerAsset).filter_by(
        player_id=player_id, asset_type_id=at.id, asset_id=asset_id
    ).first() is not None


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
    personality_id = data.get("personality_id")
    constraint_ids = data.get("constraint_ids")
    protected_word = data.get("protected_word")

    if not all([name, story, protocol_id, archetype_id, personality_id, protected_word]):
        return jsonify({"error": "Missing required fields"}), 400

    db = SessionLocal()

    player = db.query(Player).filter_by(id=user_id).first()
    if not player:
        db.close()
        return jsonify({"error": "Player not found"}), 404

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400

    # Check if player already has a fortress
    existing_fortress = db.query(Fortress).filter_by(owner_id=user_id).first()
    if existing_fortress:
        db.close()
        return jsonify({"error": "Player already has a fortress"}), 400

    protocol = db.query(Protocol).filter_by(id=protocol_id).first()
    archetype = db.query(Archetype).filter_by(id=archetype_id).first()
    personality = db.query(Personality).filter_by(id=personality_id).first()

    if not protocol or not archetype or not personality:
        db.close()
        return jsonify({"error": "Invalid protocol, archetype or personality"}), 400

    # Validar que el jugador posee los assets de pago
    if not player_owns_or_free(db, user_id, "protocol", protocol_id, protocol.unlock_cost):
        db.close()
        return jsonify({"error": f"Protocol '{protocol.name}' not owned. Purchase it from the store first."}), 403

    if not player_owns_or_free(db, user_id, "archetype", archetype_id, archetype.unlock_cost):
        db.close()
        return jsonify({"error": f"Archetype '{archetype.name}' not owned. Purchase it from the store first."}), 403

    if constraint_ids:
        constraints = db.query(GameConstraint).filter(GameConstraint.id.in_(constraint_ids)).all()
        if len(constraints) != len(constraint_ids):
            db.close()
            return jsonify({"error": "Invalid constraint IDs"}), 400
        for c in constraints:
            if not player_owns_or_free(db, user_id, "constraint", c.id, c.price):
                db.close()
                return jsonify({"error": f"Constraint not owned. Purchase it from the store first."}), 403
    else:
        constraints = []

    fortress = Fortress(
        id=generate_uuid(),
        owner_id=user_id,
        protocol_id=protocol_id,
        archetype_id=archetype_id,
        personality_id=personality_id,
        name=name,
        story=story,
        protected_word=protected_word,
        created_at=datetime.utcnow(),
        last_reconfigured_at=datetime.utcnow()
    )

    db.add(fortress)
    db.flush()  # get fortress.id before inserting constraints

    # Add constraints explicitly to fortress_constraints
    for constraint in constraints:
        fc = FortressConstraint(
            id=generate_uuid(),
            fortress_id=fortress.id,
            constraint_id=constraint.id
        )
        db.add(fc)

    # Create FortressSeasonStats for the active season
    db.add(FortressSeasonStats(
        id=generate_uuid(),
        fortress_id=fortress.id,
        season_id=season.id,
        defeat_count=0,
        attack_count=0,
        status="active",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    ))

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
        "story": fortress.story,
        "personality": fortress.personality.name,
        "personality_id": fortress.personality_id,
        "protected_word": fortress.protected_word,
        "constraints": [
            {
                "id": c.id,
                "text": c.text,
                "type": c.type.name,
                "price": c.price
            }
            for c in fortress.constraints
        ],
        "protocol": fortress.protocol.name,
        "protocol_id": fortress.protocol_id,
        "archetype": fortress.archetype.name,
        "archetype_id": fortress.archetype_id,
        "created_at": fortress.created_at
    }

    season = get_active_season(db)
    if season:
        stats = get_or_create_fortress_season_stats(db, fortress.id, season.id)
        db.commit()
        result["defeat_count"] = stats.defeat_count
    else:
        result["defeat_count"] = 0

    db.close()
    return jsonify(result)


# ==========================
# RECONFIGURE FORTRESS
# ==========================

@fortresses_bp.put("/reconfigure")
@jwt_required()
def reconfigure_fortress():
    user_id = get_jwt_identity()
    data = request.json

    db = SessionLocal()

    season = get_active_season(db)
    if not season or season.is_frozen:
        db.close()
        return jsonify({"error": "Season not active"}), 403
    
    fortress_id = db.query(Fortress).filter_by(owner_id=user_id).first().id
    fortress = db.query(Fortress).filter_by(id=fortress_id).first()

    if not fortress or fortress.owner_id != user_id:
        db.close()
        return jsonify({"error": "Not authorized"}), 403

    # Validate protected_word early — before any DB modifications
    new_word = (data.get("protected_word") or "").strip().upper()
    if not new_word:
        db.close()
        return jsonify({"error": "La palabra secreta es obligatoria"}), 400
    current_word = (fortress.protected_word or "").strip().upper()
    if new_word == current_word:
        db.close()
        return jsonify({"error": "La palabra secreta debe ser diferente a la última utilizada"}), 400

    stats = get_or_create_fortress_season_stats(
        db, fortress.id, season.id
    )

    if stats.defeat_count < 3:
        db.close()
        return jsonify({"error": f"Tu fortaleza solo tiene {stats.defeat_count} derrota(s). Necesitas al menos 3 para poder reconfigurarla."}), 403

    # COSTE DINÁMICO
    cost = 0

    # Add new protocol/archetype/personality costs if changed
    new_protocol_id = data.get("protocol_id")
    new_archetype_id = data.get("archetype_id")
    new_personality_id = data.get("personality_id")

    if new_protocol_id and new_protocol_id != fortress.protocol_id:
        new_protocol = db.query(Protocol).filter_by(id=new_protocol_id).first()
        if not new_protocol:
            db.close()
            return jsonify({"error": "Invalid protocol_id"}), 400
        if not player_owns_or_free(db, user_id, "protocol", new_protocol_id, new_protocol.unlock_cost):
            db.close()
            return jsonify({"error": f"Protocol '{new_protocol.name}' not owned. Purchase it from the store first."}), 403

    if new_archetype_id and new_archetype_id != fortress.archetype_id:
        new_archetype = db.query(Archetype).filter_by(id=new_archetype_id).first()
        if not new_archetype:
            db.close()
            return jsonify({"error": "Invalid archetype_id"}), 400
        if not player_owns_or_free(db, user_id, "archetype", new_archetype_id, new_archetype.unlock_cost):
            db.close()
            return jsonify({"error": f"Archetype '{new_archetype.name}' not owned. Purchase it from the store first."}), 403

    if new_personality_id and new_personality_id != fortress.personality_id:
        new_personality = db.query(Personality).filter_by(id=new_personality_id).first()
        if not new_personality:
            db.close()
            return jsonify({"error": "Invalid personality_id"}), 400

    # Handle constraint changes
    constraint_ids = data.get("constraint_ids")
    if constraint_ids is not None:
        constraints = db.query(GameConstraint).filter(GameConstraint.id.in_(constraint_ids)).all()
        if len(constraints) != len(constraint_ids):
            db.close()
            return jsonify({"error": "Invalid constraint IDs"}), 400
        for c in constraints:
            if not player_owns_or_free(db, user_id, "constraint", c.id, c.price):
                db.close()
                return jsonify({"error": f"Constraint not owned. Purchase it from the store first."}), 403
    else:
        return jsonify({"error": "constraint_ids required"}), 400

    player = db.query(Player).filter_by(id=user_id).first()

    if player.credits < cost:
        db.close()
        return jsonify({"error": "Not enough credits"}), 403

    player.credits -= cost

    # Actualización
    fortress.protocol_id = data.get("protocol_id", fortress.protocol_id)
    fortress.archetype_id = data.get("archetype_id", fortress.archetype_id)
    fortress.personality_id = data.get("personality_id", fortress.personality_id)
    # Replace constraints explicitly in fortress_constraints
    db.query(FortressConstraint).filter_by(fortress_id=fortress.id).delete()
    for constraint in constraints:
        fc = FortressConstraint(
            id=generate_uuid(),
            fortress_id=fortress.id,
            constraint_id=constraint.id
        )
        db.add(fc)

    fortress.protected_word = new_word

    fortress.last_reconfigured_at = datetime.utcnow()
    log = ActivityLog(
        type="fortress_reconfigured",
        actor_id=player.id,
        message=f"{player.username} ha reconfigurado su fortaleza"
    )

    db.add(log)
    stats.defeat_count = 0
    stats.attack_count = 0
    stats.status = "active"
    stats.updated_at = datetime.utcnow()

    db.commit()
    db.close()

    return jsonify({"message": "Fortress reconfigured", "cost": cost})


# ==========================
# REBUILD DESTROYED FORTRESS
# ==========================

@fortresses_bp.post("/rebuild")
@jwt_required()
def rebuild_fortress():
    user_id = get_jwt_identity()

    db = SessionLocal()

    season = get_active_season(db)
    if not season:
        db.close()
        return jsonify({"error": "No active season"}), 400
    
    fortress_id = db.query(Fortress).filter_by(owner_id=user_id).first().id
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
    stats.updated_at = datetime.utcnow()
    fortress.last_reconfigured_at = datetime.utcnow()
    db.commit()
    db.close()
