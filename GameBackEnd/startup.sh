#!/bin/bash
# Azure App Service startup script for Flask factory-pattern app
# Activate the Oryx-managed virtual environment (created by SCM_DO_BUILD_DURING_DEPLOYMENT)
ANTENV=/home/site/wwwroot/antenv
if [ -d "$ANTENV" ]; then
    echo "Activating virtual environment at $ANTENV"
    source "$ANTENV/bin/activate"
else
    echo "WARNING: antenv not found at $ANTENV, relying on PATH"
fi

cd /home/site/wwwroot
gunicorn --bind=0.0.0.0:8000 --timeout 600 --workers 2 "app:create_app()"
