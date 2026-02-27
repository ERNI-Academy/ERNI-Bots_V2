import os
from datetime import timedelta
import urllib.parse

class Config:
    # ── JWT ────────────────────────────────────────────────────────────────
    # SECURITY: must be overridden via JWT_SECRET_KEY env var in production
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_SUPER_SECRET")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ALGORITHM = "HS256"

    # ── Database ───────────────────────────────────────────────────────────
    # Azure Postgres gives "postgres://" but SQLAlchemy 2.x requires "postgresql://"
    _raw_db_url = os.getenv("DATABASE_URL", "sqlite:///dev.db")
    password = urllib.parse.quote_plus(os.environ["PASSWORD_DB"])
    DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL = DATABASE_URL.replace("[password]", password, 1)
    # ── CORS ───────────────────────────────────────────────────────────────
    # En producción: "https://tu-dominio.com"
    # Múltiples orígenes separados por coma: "https://a.com,https://b.com"
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    # ── Rate limiting (flask-limiter) ──────────────────────────────────────
    # Override RATELIMIT_STORAGE_URI with a Redis URL in production:
    # e.g.  redis://localhost:6379/0
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True
