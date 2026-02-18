from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    from db import SessionLocal
    from db.models import Player

    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    db = SessionLocal()

    # Verificar duplicados
    existing_user = db.query(Player).filter(
        (Player.username == username) |
        (Player.email == email)
    ).first()

    if existing_user:
        db.close()
        return jsonify({"error": "Username or email already exists"}), 409

    password_hash = generate_password_hash(password)

    new_user = Player(
        username=username,
        email=email,
        password_hash=password_hash
    )

    db.add(new_user)
    db.commit()
    db.close()

    return jsonify({"message": "User registered"}), 201

@auth_bp.post("/login")
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    # TODODB: Retrieve user and validate password
    user_id = "mock-user-id"

    access_token = create_access_token(identity=user_id)
    return jsonify({"access_token": access_token})