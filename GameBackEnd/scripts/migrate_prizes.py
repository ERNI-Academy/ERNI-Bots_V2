"""
Migration: create the prizes table and seed initial CTF prizes.

Run once from the GameBackEnd directory:
    python -m scripts.migrate_prizes
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.base import Base
from db import engine, SessionLocal
from db.models import Prize


INITIAL_PRIZES = [
    {
        "sort_order": 1,
        "name": "Estuche de ganzúas KLOM antideslizantes",
        "tagline": "Adéntrate en el mundo de la seguridad física",
        "icon": "key",
        "category": "PHYSICAL_SECURITY",
        "color_key": "red",
        "description": (
            "Herramientas profesionales para explorar el lockpicking y comprender "
            "de primera mano cómo funciona la seguridad física. Porque no toda la "
            "seguridad está en el código."
        ),
        "winner_username": None,
    },
    {
        "sort_order": 2,
        "name": "YubiKey Security Key C NFC",
        "tagline": "Tu MFA de confianza",
        "icon": "security",
        "category": "AUTHENTICATION",
        "color_key": "cyan",
        "description": (
            "Llave de seguridad hardware con soporte NFC y USB-C. Autenticación de "
            "dos factores física que no puede ser phisheada. Porque las contraseñas "
            "solas ya no son suficientes."
        ),
        "winner_username": None,
    },
    {
        "sort_order": 3,
        "name": "5× ATTINY85 Digispark — Placa de Desarrollo Binghe",
        "tagline": "Crea tus propios rubber duckies",
        "icon": "usb",
        "category": "HARDWARE_HACKING",
        "color_key": "green",
        "description": (
            "Microcontroladores USB programables. Conviértelos en teclados HID "
            "automatizados, exfiltra datos, prueba la resistencia humana ante ataques "
            "físicos. El kit perfecto para entender el vector de ataque más subestimado."
        ),
        "winner_username": None,
    },
]


def run():
    # 1. Create the table if it doesn't exist yet
    Base.metadata.create_all(bind=engine, tables=[Prize.__table__])
    print("[migrate_prizes] Table 'prizes' ensured.")

    # 2. Seed only if the table is empty (idempotent)
    db = SessionLocal()
    try:
        existing_count = db.query(Prize).count()
        if existing_count > 0:
            print(f"[migrate_prizes] Table already has {existing_count} row(s) — skipping seed.")
            return

        from db.models import generate_uuid
        for entry in INITIAL_PRIZES:
            prize = Prize(id=generate_uuid(), **entry)
            db.add(prize)
            print(f"  + Inserted  prize='{entry['name'][:50]}'")

        db.commit()
        print(f"[migrate_prizes] Done. {len(INITIAL_PRIZES)} row(s) inserted.")
    except Exception as exc:
        db.rollback()
        print(f"[migrate_prizes] ERROR: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
