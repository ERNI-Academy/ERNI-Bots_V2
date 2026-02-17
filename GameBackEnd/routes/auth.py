from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    # TODODB: Save user with hashed password
    password_hash = generate_password_hash(password)

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