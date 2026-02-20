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

# Give Flask a moment to start before Next.js tries to connect
sleep 3

# ── Next.js (Node) ──────────────────────────────────────────────────────────
echo "[startup] Installing Node.js production dependencies..."
cd /home/site/wwwroot/web
npm ci --omit=dev

echo "[startup] Starting Next.js on :${PORT:-8080}..."
exec npm start
