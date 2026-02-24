#!/bin/bash
# Azure App Service startup script for FastAPI (AgenticService)

APP_DIR="${APP_PATH:-}"

# Fall back: search for main.py under /tmp if APP_PATH is not set
if [ -z "$APP_DIR" ] || [ ! -f "$APP_DIR/main.py" ]; then
    FOUND=$(find /tmp -name "main.py" -maxdepth 4 2>/dev/null | grep -v "__pycache__" | head -1)
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

echo "[startup] Starting AgenticService with uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
