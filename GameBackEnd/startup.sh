#!/bin/bash
# Azure App Service startup script for Flask factory-pattern app
# Redirects all output to a log file readable via Kudu
exec > /home/site/wwwroot/startup_debug.log 2>&1

# Activate the Oryx-managed virtual environment (created by SCM_DO_BUILD_DURING_DEPLOYMENT)
ANTENV=/home/site/wwwroot/antenv
if [ -d "$ANTENV" ]; then
    echo "[startup] Activating virtual environment at $ANTENV"
    source "$ANTENV/bin/activate"
else
    echo "[startup] WARNING: antenv not found at $ANTENV"
    echo "[startup] Listing /home/site/wwwroot:"
    ls -la /home/site/wwwroot/
fi

cd /home/site/wwwroot

echo "[startup] Python: $(python --version 2>&1)"
echo "[startup] Gunicorn: $(gunicorn --version 2>&1)"
echo "[startup] Working dir: $(pwd)"
echo "[startup] PYTHONPATH: $PYTHONPATH"
echo "[startup] PATH: $PATH"
echo "[startup] Environment: DATABASE_URL=$DATABASE_URL AGENT_MODE=$AGENT_MODE"

# Test app import - captures Python errors clearly
echo "[startup] Testing app import..."
python -c "from app import create_app; create_app()" 2>&1
IMPORT_EXIT=$?
echo "[startup] Import exit code: $IMPORT_EXIT"

if [ $IMPORT_EXIT -ne 0 ]; then
    echo "[startup] IMPORT FAILED. Check startup_debug.log via Kudu."
    # Keep stdout/stderr going to the file so Azure can see exit code
    exit 1
fi

echo "[startup] Starting gunicorn..."
exec gunicorn --bind=0.0.0.0:8000 --timeout 600 --workers 2 "app:create_app()"
