#!/bin/bash
# Azure App Service startup script for Flask factory-pattern app
# Activate the Oryx-managed virtual environment (created by SCM_DO_BUILD_DURING_DEPLOYMENT)
ANTENV=/home/site/wwwroot/antenv
if [ -d "$ANTENV" ]; then
    echo "[startup] Activating virtual environment at $ANTENV"
    source "$ANTENV/bin/activate"
else
    echo "[startup] WARNING: antenv not found at $ANTENV, relying on PATH"
fi

cd /home/site/wwwroot

echo "[startup] Python: $(python --version 2>&1)"
echo "[startup] Gunicorn: $(gunicorn --version 2>&1)"
echo "[startup] Working dir: $(pwd)"

# Test app import before starting gunicorn - captures Python errors clearly
echo "[startup] Testing app import..."
python -c "from app import create_app; create_app()" && echo "[startup] Import OK" || { echo "[startup] IMPORT FAILED - see error above"; exit 1; }

echo "[startup] Starting gunicorn..."
exec gunicorn --bind=0.0.0.0:8000 --timeout 600 --workers 2 "app:create_app()"
