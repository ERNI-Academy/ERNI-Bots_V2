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

echo "[startup] Running migrations..."
# python scripts/migrate_player_ban.py
# python scripts/migrate_is_bot.py
# python scripts/migrate_boss_reward_score.py || { echo "[startup] Migration failed, aborting."; exit 1; }
# python scripts/migrate_boss_decay_config.py || { echo "[startup] Migration failed, aborting."; exit 1; }
# python scripts/migrate_invitation_tag.py || { echo "[startup] Migration failed, aborting."; exit 1; }
# python scripts/migrate_tag_bots.py || { echo "[startup] Migration failed, aborting."; exit 1; }
echo "[startup] Migrations completed."

# Run seed only when SEED_DB=true is explicitly set (e.g. via Azure App Settings on first deploy)
if [ "${SEED_DB:-false}" = "true" ]; then
    echo "[startup] SEED_DB=true detected — running seed script..."
    python scripts/seed.py
    echo "[startup] Seed completed."
else
    echo "[startup] Skipping seed (set SEED_DB=true to run)."
fi

exec gunicorn --bind=0.0.0.0:8000 --timeout 600 --workers 2 "app:create_app()"
