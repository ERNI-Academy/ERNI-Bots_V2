import os

class Config:
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_SUPER_SECRET")
    DATABASE_URL =  os.getenv(
        "DATABASE_URL",
        "sqlite:///dev.db"  # default desarrollo
    )
