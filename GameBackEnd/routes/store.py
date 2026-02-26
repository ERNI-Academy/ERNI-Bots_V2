from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from db import SessionLocal
from db.models import (
    Player,
    Protocol,
    Archetype,
    GameConstraint,
    AssetType,
    PlayerAsset,
    PlayerHistoryEntry,
)
from utils import generate_uuid

store_bp = Blueprint("store", __name__)

# Valid asset type names (must match asset_types.name in DB)
VALID_ASSET_TYPE_NAMES = ("protocol", "archetype", "constraint")


# ==========================
# Helper: resolve asset
# ==========================

def _get_asset(db, asset_type: str, asset_id: str):
    """Return (asset_obj, price) or (None, None) if not found."""
    if asset_type == "protocol":
        obj = db.query(Protocol).filter_by(id=asset_id).first()
        return (obj, obj.unlock_cost) if obj else (None, None)
    if asset_type == "archetype":
        obj = db.query(Archetype).filter_by(id=asset_id).first()
        return (obj, obj.unlock_cost) if obj else (None, None)
    if asset_type == "constraint":
        obj = db.query(GameConstraint).filter_by(id=asset_id).first()
        return (obj, obj.price) if obj else (None, None)
    return (None, None)


# ==========================
# GET /store/catalog
# ==========================

@store_bp.get("/catalog")
@jwt_required()
def get_catalog():
    """
    Returns all purchasable assets grouped by type.
    Each item includes an 'owned' flag for the current player.
    """
    user_id = get_jwt_identity()
    db = SessionLocal()

    try:
        # Collect owned asset (type_id, asset_id) pairs for this player
        owned_rows = (
            db.query(PlayerAsset.asset_type_id, PlayerAsset.asset_id)
            .filter_by(player_id=user_id)
            .all()
        )
        owned_by_type_id = {(row.asset_type_id, row.asset_id) for row in owned_rows}

        # Map type name → id for quick lookup
        asset_types = {at.name: at.id for at in db.query(AssetType).all()}

        protocols = db.query(Protocol).all()
        archetypes = db.query(Archetype).all()
        constraints = db.query(GameConstraint).all()

        result = {
            "protocols": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "price": p.unlock_cost,
                    "owned": (asset_types.get("protocol"), p.id) in owned_by_type_id,
                }
                for p in protocols
            ],
            "archetypes": [
                {
                    "id": a.id,
                    "name": a.name,
                    "description": a.description,
                    "price": a.unlock_cost,
                    "owned": (asset_types.get("archetype"), a.id) in owned_by_type_id,
                }
                for a in archetypes
            ],
            "constraints": [
                {
                    "id": c.id,
                    "type": c.type.name if c.type else None,
                    "text": c.text,
                    "price": c.price,
                    "owned": (asset_types.get("constraint"), c.id) in owned_by_type_id,
                }
                for c in constraints
            ],
        }

        return jsonify(result)
    finally:
        db.close()


# ==========================
# POST /store/buy
# ==========================

@store_bp.post("/buy")
@jwt_required()
def buy_asset():
    """
    Purchase a single asset.
    Body: { "asset_type": "protocol"|"archetype"|"constraint", "asset_id": "<id>" }
    Deducts player.credits and records the purchase in player_assets.
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    asset_type_name = data.get("asset_type", "").strip().lower()
    asset_id = data.get("asset_id", "").strip()

    if asset_type_name not in VALID_ASSET_TYPE_NAMES:
        return jsonify({"error": f"asset_type must be one of {VALID_ASSET_TYPE_NAMES}"}), 400
    if not asset_id:
        return jsonify({"error": "asset_id is required"}), 400

    db = SessionLocal()

    try:
        player = db.query(Player).filter_by(id=user_id).first()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        # Resolve AssetType row
        asset_type_obj = db.query(AssetType).filter_by(name=asset_type_name).first()
        if not asset_type_obj:
            return jsonify({"error": f"Asset type '{asset_type_name}' not configured"}), 500

        # Check if already owned
        existing = (
            db.query(PlayerAsset)
            .filter_by(player_id=user_id, asset_type_id=asset_type_obj.id, asset_id=asset_id)
            .first()
        )
        if existing:
            return jsonify({"error": "Asset already owned"}), 409

        # Resolve asset and price
        asset_obj, price = _get_asset(db, asset_type_name, asset_id)
        if asset_obj is None:
            return jsonify({"error": "Asset not found"}), 404

        # Check funds
        if player.credits < price:
            return jsonify({
                "error": "Insufficient credits",
                "required": price,
                "available": player.credits,
            }), 402

        # Deduct credits
        player.credits -= price

        # Record purchase
        now = datetime.utcnow()
        purchase = PlayerAsset(
            id=generate_uuid(),
            player_id=user_id,
            asset_type_id=asset_type_obj.id,
            asset_id=asset_id,
            purchased_at=now,
            purchase_price=price,
        )
        db.add(purchase)

        # History entry
        asset_name = getattr(asset_obj, "name", None) or getattr(asset_obj, "text", asset_id)
        history = PlayerHistoryEntry(
            id=generate_uuid(),
            player_id=user_id,
            type="fragments",
            amount=-price,
            reason=f"{asset_type_name}_purchased",
            detail=f"{asset_type_name.capitalize()} '{asset_name}' purchased for {price} credits",
        )
        db.add(history)

        db.commit()

        return jsonify({
            "message": "Purchase successful",
            "asset_type": asset_type_name,
            "asset_id": asset_id,
            "purchase_price": price,
            "credits_remaining": player.credits,
            "purchased_at": now.isoformat(),
        }), 201

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ==========================
# GET /store/inventory
# ==========================

@store_bp.get("/inventory")
@jwt_required()
def get_inventory():
    """
    Returns all assets purchased by the current player, grouped by type.
    Each entry includes the asset details and purchase metadata.
    """
    user_id = get_jwt_identity()
    db = SessionLocal()

    try:
        rows = (
            db.query(PlayerAsset)
            .filter_by(player_id=user_id)
            .order_by(PlayerAsset.purchased_at.desc())
            .all()
        )

        protocols = []
        archetypes = []
        constraints = []

        for row in rows:
            type_name = row.asset_type.name if row.asset_type else ""
            asset_obj, _ = _get_asset(db, type_name, row.asset_id)
            meta = {
                "purchase_id": row.id,
                "asset_id": row.asset_id,
                "purchased_at": row.purchased_at.isoformat(),
                "purchase_price": row.purchase_price,
            }

            if type_name == "protocol" and asset_obj:
                protocols.append({
                    **meta,
                    "name": asset_obj.name,
                    "description": asset_obj.description,
                })
            elif type_name == "archetype" and asset_obj:
                archetypes.append({
                    **meta,
                    "name": asset_obj.name,
                    "description": asset_obj.description,
                })
            elif type_name == "constraint" and asset_obj:
                constraints.append({
                    **meta,
                    "type": asset_obj.type.name if asset_obj.type else None,
                    "text": asset_obj.text,
                })

        return jsonify({
            "protocols": protocols,
            "archetypes": archetypes,
            "constraints": constraints,
        })
    finally:
        db.close()
