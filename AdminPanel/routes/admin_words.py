"""
Admin words management routes.

All endpoints require X-Admin-Secret header.

GET    /api/v1/admin/words           List all protected words (paginated + search)
POST   /api/v1/admin/words           Create a new protected word
PATCH  /api/v1/admin/words/<id>      Update a word
DELETE /api/v1/admin/words/<id>      Delete a word
"""

import logging

from flask import Blueprint, jsonify, request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from db.models import PlayerWord, ProtectedWord
from routes.admin import _check_admin

logger = logging.getLogger(__name__)
admin_words_bp = Blueprint("admin_words", __name__)


# ──────────────────────────────────────────────────────────
# GET /words   – paginated list with optional text search
# ──────────────────────────────────────────────────────────

@admin_words_bp.get("/words")
def list_words():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    search   = (request.args.get("q") or "").strip().lower()
    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(200, max(1, int(request.args.get("per_page", 50))))

    db = SessionLocal()
    try:
        q = db.query(ProtectedWord)
        if search:
            q = q.filter(func.lower(ProtectedWord.word).contains(search))
        total = q.count()
        words = (
            q.order_by(ProtectedWord.word)
             .offset((page - 1) * per_page)
             .limit(per_page)
             .all()
        )
        return jsonify({
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    (total + per_page - 1) // per_page,
            "items":    [{"id": w.id, "word": w.word} for w in words],
        })
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# POST /words  – create
# ──────────────────────────────────────────────────────────

@admin_words_bp.post("/words")
def create_word():
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    word = str(data.get("word") or "").strip().lower()

    if not word:
        return jsonify({"error": "El campo 'word' es obligatorio"}), 400
    if len(word) > 100:
        return jsonify({"error": "La palabra es demasiado larga (máx. 100 caracteres)"}), 400

    db = SessionLocal()
    try:
        if db.query(ProtectedWord).filter_by(word=word).first():
            return jsonify({"error": f"La palabra '{word}' ya existe"}), 409

        pw = ProtectedWord(word=word)
        db.add(pw)
        db.commit()
        db.refresh(pw)
        logger.info("admin: created protected word id=%s word=%s", pw.id, pw.word)
        return jsonify({"id": pw.id, "word": pw.word}), 201

    except IntegrityError:
        db.rollback()
        return jsonify({"error": f"La palabra '{word}' ya existe"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: create_word failed")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# PATCH /words/<id>  – update
# ──────────────────────────────────────────────────────────

@admin_words_bp.patch("/words/<word_id>")
def update_word(word_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    data     = request.get_json(silent=True) or {}
    new_word = str(data.get("word") or "").strip().lower()

    if not new_word:
        return jsonify({"error": "El campo 'word' es obligatorio"}), 400
    if len(new_word) > 100:
        return jsonify({"error": "La palabra es demasiado larga (máx. 100 caracteres)"}), 400

    db = SessionLocal()
    try:
        pw = db.query(ProtectedWord).filter_by(id=word_id).first()
        if not pw:
            return jsonify({"error": "Palabra no encontrada"}), 404

        if new_word != pw.word:
            conflict = db.query(ProtectedWord).filter(
                ProtectedWord.word == new_word,
                ProtectedWord.id   != word_id,
            ).first()
            if conflict:
                return jsonify({"error": f"La palabra '{new_word}' ya existe"}), 409
            pw.word = new_word
            db.commit()
            db.refresh(pw)

        return jsonify({"id": pw.id, "word": pw.word})

    except IntegrityError:
        db.rollback()
        return jsonify({"error": f"La palabra '{new_word}' ya existe"}), 409
    except Exception:
        db.rollback()
        logger.exception("admin: update_word failed id=%s", word_id)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()


# ──────────────────────────────────────────────────────────
# DELETE /words/<id>
# ──────────────────────────────────────────────────────────

@admin_words_bp.delete("/words/<word_id>")
def delete_word(word_id: str):
    if not _check_admin():
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        pw = db.query(ProtectedWord).filter_by(id=word_id).first()
        if not pw:
            return jsonify({"error": "Palabra no encontrada"}), 404

        # Remove player-word assignments first
        db.query(PlayerWord).filter_by(word_id=word_id).delete()
        db.delete(pw)
        db.commit()
        logger.info("admin: deleted protected word id=%s", word_id)
        return jsonify({"ok": True})

    except Exception:
        db.rollback()
        logger.exception("admin: delete_word failed id=%s", word_id)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        db.close()
