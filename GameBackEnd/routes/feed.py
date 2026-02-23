from flask import Blueprint, jsonify
from db import SessionLocal
from db.models import ActivityLog

feed_bp = Blueprint("feed", __name__)


@feed_bp.get("")
def get_feed():
    db = SessionLocal()

    logs = (
        db.query(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(30)
        .all()
    )

    result = []

    for log in logs:
        result.append({
            "type": log.type,
            "message": log.message,
            "timestamp": log.created_at.isoformat()
        })

    db.close()
    return jsonify(result)