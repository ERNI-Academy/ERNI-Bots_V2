"""
Admin season management routes.

All endpoints require X-Admin-Secret header.

GET    /seasons               – list all seasons
POST   /seasons               – create a season
PUT    /seasons/<id>          – update editable fields
POST   /seasons/<id>/activate – make this season active (deactivates all others)
POST   /seasons/<id>/freeze   – toggle is_frozen
POST   /seasons/<id>/finalize – finalize (marks is_active=False, finalized=True)
DELETE /seasons/<id>          – hard-delete (only if no player/fortress stats exist)
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from db import SessionLocal
from db.models import Season, PlayerSeasonStats, FortressSeasonStats, Player, Fortress
from routes.admin import _check_admin

admin_seasons_bp = Blueprint("admin_seasons", __name__)


# ──────────────────────────────────────────────────────────
# Serializer
# ──────────────────────────────────────────────────────────

def _season_to_dict(s: Season, db=None) -> dict:
    player_count = 0
    fortress_count = 0
    if db is not None:
        from sqlalchemy import func
        player_count = (
            db.query(func.count(PlayerSeasonStats.id))
            .join(Player, Player.id == PlayerSeasonStats.player_id)
            .filter(PlayerSeasonStats.season_id == s.id)
            .filter(Player.is_bot == False)   # noqa: E712
            .scalar() or 0
        )
        fortress_count = (
            db.query(func.count(FortressSeasonStats.id))
            .join(Fortress, Fortress.id == FortressSeasonStats.fortress_id)
            .join(Player, Player.id == Fortress.owner_id)
            .filter(FortressSeasonStats.season_id == s.id)
            .filter(Player.is_bot == False)   # noqa: E712
            .scalar() or 0
        )
    return {
        "id":             s.id,
        "name":           s.name,
        "is_active":      s.is_active,
        "is_ranked":      s.is_ranked,
        "is_frozen":      s.is_frozen,
        "finalized":      s.finalized,
        "start_date":     s.start_date.isoformat() + "Z" if s.start_date else None,
        "end_date":       s.end_date.isoformat() + "Z" if s.end_date else None,
        "player_count":   player_count,
        "fortress_count": fortress_count,
    }


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


# ──────────────────────────────────────────────────────────
# GET /seasons
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.get("/seasons")
def list_seasons():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        seasons = db.query(Season).order_by(Season.start_date.desc()).all()
        return jsonify([_season_to_dict(s, db) for s in seasons]), 200
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /seasons
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.post("/seasons")
def create_season():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "'name' is required"}), 400

    db = SessionLocal()
    try:
        s = Season(
            name=name,
            is_active=False,
            is_ranked=bool(data.get("is_ranked", True)),
            is_frozen=False,
            finalized=False,
            start_date=_parse_dt(data.get("start_date")) or datetime.utcnow(),
            end_date=_parse_dt(data.get("end_date")),
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        return jsonify(_season_to_dict(s)), 201
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PUT /seasons/<id>
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.route("/seasons/<season_id>", methods=["PUT"])
def update_season(season_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        s = db.get(Season, season_id)
        if not s:
            return jsonify({"error": "Season not found"}), 404
        if s.finalized:
            return jsonify({"error": "Cannot edit a finalized season"}), 409

        if "name" in data:
            v = data["name"].strip()
            if not v:
                return jsonify({"error": "'name' cannot be empty"}), 400
            s.name = v
        if "is_ranked" in data:
            s.is_ranked = bool(data["is_ranked"])
        if "start_date" in data:
            s.start_date = _parse_dt(data["start_date"]) or s.start_date
        if "end_date" in data:
            s.end_date = _parse_dt(data["end_date"])

        db.commit()
        db.refresh(s)
        return jsonify(_season_to_dict(s, db)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /seasons/<id>/activate
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.post("/seasons/<season_id>/activate")
def activate_season(season_id: str):
    """Set this season as the only active one. Deactivates all others."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        target = db.get(Season, season_id)
        if not target:
            return jsonify({"error": "Season not found"}), 404
        if target.finalized:
            return jsonify({"error": "Cannot activate a finalized season"}), 409

        # Deactivate all
        db.query(Season).update({Season.is_active: False})
        target.is_active = True
        db.commit()
        db.refresh(target)
        return jsonify(_season_to_dict(target, db)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /seasons/<id>/freeze
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.post("/seasons/<season_id>/freeze")
def toggle_freeze(season_id: str):
    """Toggle is_frozen on a season."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        s = db.get(Season, season_id)
        if not s:
            return jsonify({"error": "Season not found"}), 404
        if s.finalized:
            return jsonify({"error": "Cannot freeze/unfreeze a finalized season"}), 409

        s.is_frozen = not s.is_frozen
        db.commit()
        db.refresh(s)
        return jsonify(_season_to_dict(s, db)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /seasons/<id>/finalize
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.post("/seasons/<season_id>/finalize")
def finalize_season(season_id: str):
    """Close a season permanently: sets finalized=True, is_active=False."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        s = db.get(Season, season_id)
        if not s:
            return jsonify({"error": "Season not found"}), 404
        if s.finalized:
            return jsonify({"error": "Season is already finalized"}), 409

        s.finalized = True
        s.is_active = False
        s.is_frozen = False
        if not s.end_date:
            s.end_date = datetime.utcnow()
        db.commit()
        db.refresh(s)
        return jsonify(_season_to_dict(s, db)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /seasons/<id>/reactivate
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.post("/seasons/<season_id>/reactivate")
def reactivate_season(season_id: str):
    """Reopen a finalized season: clears finalized flag and sets it as the only active season."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        target = db.get(Season, season_id)
        if not target:
            return jsonify({"error": "Season not found"}), 404
        if not target.finalized:
            return jsonify({"error": "Season is not finalized"}), 409

        # Deactivate all others
        db.query(Season).update({Season.is_active: False})
        target.finalized = False
        target.is_active = True
        target.is_frozen = False
        db.commit()
        db.refresh(target)
        return jsonify(_season_to_dict(target, db)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /seasons/<id>
# ──────────────────────────────────────────────────────────

@admin_seasons_bp.route("/seasons/<season_id>", methods=["DELETE"])
def delete_season(season_id: str):
    """Hard-delete a season. Blocked if any player/fortress stats exist."""
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        s = db.get(Season, season_id)
        if not s:
            return jsonify({"error": "Season not found"}), 404
        if s.is_active:
            return jsonify({"error": "Cannot delete the active season"}), 409

        from sqlalchemy import func
        ps = db.query(func.count(PlayerSeasonStats.id)).filter(
            PlayerSeasonStats.season_id == season_id
        ).scalar() or 0
        fs = db.query(func.count(FortressSeasonStats.id)).filter(
            FortressSeasonStats.season_id == season_id
        ).scalar() or 0

        if ps > 0 or fs > 0:
            return jsonify({
                "error": f"Cannot delete: season has {ps} player stat(s) and {fs} fortress stat(s)"
            }), 409

        db.delete(s)
        db.commit()
        return jsonify({"ok": True}), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
