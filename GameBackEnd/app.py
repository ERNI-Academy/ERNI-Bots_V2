from flask import Flask
from flask_jwt_extended import JWTManager
from config import Config
from routes.auth import auth_bp
from routes.players import players_bp
from routes.fortresses import fortresses_bp
from routes.battles import battles_bp
from routes.leaderboard import leaderboard_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    jwt = JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(players_bp, url_prefix="/api/v1/players")
    app.register_blueprint(fortresses_bp, url_prefix="/api/v1/fortresses")
    app.register_blueprint(battles_bp, url_prefix="/api/v1/battles")
    app.register_blueprint(leaderboard_bp, url_prefix="/api/v1/leaderboard")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)