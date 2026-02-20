#!/bin/bash
# Azure App Service startup script for Flask (application factory pattern)

APP_DIR="${APP_PATH:-}"

# Fall back: search for app.py under /tmp if APP_PATH is not set
if [ -z "$APP_DIR" ] || [ ! -f "$APP_DIR/app.py" ]; then
    FOUND=$(find /tmp -name "app.py" -maxdepth 4 2>/dev/null | grep -v "__pycache__" | head -1)
    if [ -n "$FOUND" ]; then
        APP_DIR=$(dirname "$FOUND")
    fi
fi

# Activate the Oryx-managed virtual environment if present
ANTENV="$APP_DIR/antenv"
if [ -d "$ANTENV" ]; then
    source "$ANTENV/bin/activate"
fi

cd "$APP_DIR"

echo "[startup] Initializing database..."
python create_db.py

exec gunicorn --bind=0.0.0.0:8000 --timeout 600 --workers 2 "app:create_app()"
