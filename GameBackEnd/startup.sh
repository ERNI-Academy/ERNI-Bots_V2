#!/bin/bash
# Azure App Service startup script for Flask factory-pattern app
# Redirects all output to a log file readable via Kudu
exec > /home/site/wwwroot/startup_debug.log 2>&1

echo "[startup] All env vars:"
env | sort

echo "[startup] ORYX_APP_PATH=$ORYX_APP_PATH"

# Find the actual app directory (Oryx extracts tar to /tmp/<hash>)
APP_DIR="${ORYX_APP_PATH:-/home/site/wwwroot}"

# Look for app.py to find the real app directory
if [ ! -f "$APP_DIR/app.py" ]; then
    echo "[startup] app.py not found at $APP_DIR, searching..."
    FOUND=$(find /tmp -name "app.py" -maxdepth 4 2>/dev/null | grep -v "__pycache__" | head -1)
    if [ -n "$FOUND" ]; then
        APP_DIR=$(dirname "$FOUND")
        echo "[startup] Found app.py at: $FOUND, using dir: $APP_DIR"
    fi
fi

echo "[startup] Using APP_DIR: $APP_DIR"
ls -la "$APP_DIR/"

# Activate the Oryx-managed virtual environment
ANTENV="$APP_DIR/antenv"
if [ -d "$ANTENV" ]; then
    echo "[startup] Activating virtual environment at $ANTENV"
    source "$ANTENV/bin/activate"
else
    echo "[startup] WARNING: antenv not found at $ANTENV, relying on injected PYTHONPATH"
fi

cd "$APP_DIR"
echo "[startup] Python: $(python --version 2>&1)"
echo "[startup] Gunicorn: $(gunicorn --version 2>&1)"
echo "[startup] Working dir: $(pwd)"

echo "[startup] Testing app import..."
python -c "from app import create_app; create_app()" 2>&1
IMPORT_EXIT=$?
echo "[startup] Import exit code: $IMPORT_EXIT"

if [ $IMPORT_EXIT -ne 0 ]; then
    echo "[startup] IMPORT FAILED."
    exit 1
fi

echo "[startup] Starting gunicorn..."
exec gunicorn --bind=0.0.0.0:8000 --timeout 600 --workers 2 "app:create_app()"
