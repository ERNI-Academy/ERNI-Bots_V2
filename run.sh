#!/bin/bash

# ── Flask (Python) ──────────────────────────────────────────────────────────
echo "[run.sh] Installing Python dependencies..."
cd /home/site/wwwroot/GameBackEnd
pip install -r requirements.txt -q

echo "[run.sh] Initializing database..."
python3 create_db.py

echo "[run.sh] Starting Flask (gunicorn) on 127.0.0.1:5000..."
gunicorn -w 2 -b 127.0.0.1:5000 "app:create_app()" &

sleep 2
echo "[run.sh] Flask started. Handing off to Next.js..."
