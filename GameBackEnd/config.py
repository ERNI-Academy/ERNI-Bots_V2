import os
from datetime import timedelta


class Config:
    # ── JWT ────────────────────────────────────────────────────────────────
    # SECURITY: must be overridden via JWT_SECRET_KEY env var in production
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_SUPER_SECRET")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ALGORITHM = "HS256"

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "sqlite:///dev.db"  # default desarrollo
    )

    # ── CORS ───────────────────────────────────────────────────────────────
    # En producción: "https://tu-dominio.com"
    # Múltiples orígenes separados por coma: "https://a.com,https://b.com"
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    # ── Rate limiting (flask-limiter) ──────────────────────────────────────
    # Override RATELIMIT_STORAGE_URI with a Redis URL in production:
    # e.g.  redis://localhost:6379/0
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True
