from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from config import Config
from extensions import limiter
from routes.auth import auth_bp
from routes.players import players_bp
from routes.fortresses import fortresses_bp
from routes.battles import battles_bp
from routes.leaderboard import leaderboard_bp
from routes.admin import admin_bp
from routes.admin_catalog import admin_catalog_bp
from routes.admin_bosses import admin_bosses_bp
from routes.admin_archetypes import admin_archetypes_bp
from routes.admin_protocols import admin_protocols_bp
from routes.archetypes import archetypes_bp
from routes.protocols import protocols_bp
from routes.constraints import constraints_bp
from routes.words import words_bp
from routes.personalities import personalities_bp
from routes.store import store_bp
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── CORS ───────────────────────────────────────────────────────────────
    origins = [o.strip() for o in app.config["CORS_ORIGINS"].split(",")]
    CORS(app, origins=origins, supports_credentials=True)

    # ── JWT ────────────────────────────────────────────────────────────────
    jwt = JWTManager(app)

    @jwt.token_in_blocklist_loader
    def _check_token_revoked(jwt_header, jwt_payload):
        """Return True if the token's jti is in the revocation table."""
        from db import SessionLocal
        from db.models import TokenBlocklist
        jti = jwt_payload["jti"]
        db = SessionLocal()
        try:
            return db.query(TokenBlocklist).filter_by(jti=jti).first() is not None
        finally:
            db.close()

    @jwt.revoked_token_loader
    def _revoked_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked"}), 401

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({"error": "Authorization token required"}), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({"error": "Invalid token"}), 401

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    # ── Rate limiter ───────────────────────────────────────────────────────
    limiter.init_app(app)

    # ── Security headers ───────────────────────────────────────────────────
    @app.after_request
    def _security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response

    # ── Blueprints ─────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp,        url_prefix="/api/v1/auth")
    app.register_blueprint(players_bp,     url_prefix="/api/v1/players")
    app.register_blueprint(fortresses_bp,  url_prefix="/api/v1/fortresses")
    app.register_blueprint(battles_bp,     url_prefix="/api/v1/battles")
    app.register_blueprint(leaderboard_bp, url_prefix="/api/v1/leaderboard")
    app.register_blueprint(admin_bp,            url_prefix="/api/v1/admin")
    app.register_blueprint(admin_catalog_bp,    url_prefix="/api/v1/admin")
    app.register_blueprint(admin_bosses_bp,     url_prefix="/api/v1/admin")
    app.register_blueprint(admin_archetypes_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(admin_protocols_bp,  url_prefix="/api/v1/admin")
    app.register_blueprint(archetypes_bp,       url_prefix="/api/v1/archetypes")
    app.register_blueprint(protocols_bp,   url_prefix="/api/v1/protocols")

    app.register_blueprint(constraints_bp, url_prefix="/api/v1/constraints")
    app.register_blueprint(words_bp,          url_prefix="/api/v1/words")
    app.register_blueprint(personalities_bp,  url_prefix="/api/v1/personalities")
    app.register_blueprint(store_bp,          url_prefix="/api/v1/store")
    return app


# Expose app at module level so gunicorn can find it with "app:app"
app = create_app()

if __name__ == "__main__":
    app.run(debug=False)
