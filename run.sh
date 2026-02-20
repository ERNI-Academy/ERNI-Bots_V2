#!/bin/bash
set -e

# ── Flask (Python) ──────────────────────────────────────────────────────────
echo "[startup] Installing Python dependencies..."
cd /home/site/wwwroot/GameBackEnd
pip install -r requirements.txt -q

echo "[startup] Initializing database..."
python create_db.py

echo "[startup] Starting Flask (gunicorn) on 127.0.0.1:5000..."
gunicorn -w 2 -b 127.0.0.1:5000 "app:create_app()" &

# Give Flask a moment to be ready before Next.js tries to reach it
sleep 3

# ── Next.js (Node) ──────────────────────────────────────────────────────────
echo "[startup] Starting Next.js on :${PORT:-8080}..."
cd /home/site/wwwroot
exec node_modules/.bin/next start -p "${PORT:-8080}"
