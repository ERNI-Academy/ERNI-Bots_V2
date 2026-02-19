"""
Admin CLI utility: create invitation codes.

Usage (run from GameBackEnd/):
    python scripts/create_invitation.py                       # single code, no expiry
    python scripts/create_invitation.py --expires 2026-12-31  # with expiry date
    python scripts/create_invitation.py --created-by "admin"  # audit label

The script prints the PLAIN CODE once — it is NOT stored anywhere.
Give this plain code to the player; the database only stores the hash.
"""

import argparse
import sys
import os
import secrets
import string
from datetime import datetime

# Ensure GameBackEnd/ is in path when running as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from werkzeug.security import generate_password_hash
from db import SessionLocal, engine
from db.base import Base
import db.models  # register all models with Base


def _generate_plain_code(length: int = 32) -> str:
    """
    Cryptographically random code using URL-safe characters.
    Format: XXXX-XXXX-XXXX-XXXX (groups of 8, separated by dashes for readability).
    """
    alphabet = string.ascii_uppercase + string.digits
    raw = "".join(secrets.choice(alphabet) for _ in range(length))
    # Group into chunks of 8
    return "-".join(raw[i:i+8] for i in range(0, len(raw), 8))


def main():
    parser = argparse.ArgumentParser(description="Create an invitation code")
    parser.add_argument("--expires",     metavar="YYYY-MM-DD", help="Expiry date (optional)")
    parser.add_argument("--created-by",  metavar="LABEL",      help="Audit label (optional)")
    parser.add_argument("--max-uses",    type=int, default=1,  help="Max registrations (default 1)")
    args = parser.parse_args()

    expires_at = None
    if args.expires:
        try:
            expires_at = datetime.strptime(args.expires, "%Y-%m-%d")
        except ValueError:
            print("ERROR: --expires must be YYYY-MM-DD", file=sys.stderr)
            sys.exit(1)

    # Ensure tables exist
    Base.metadata.create_all(engine)

    plain_code = _generate_plain_code()
    code_hash  = generate_password_hash(plain_code)

    from db.models import InvitationCode
    db = SessionLocal()
    try:
        inv = InvitationCode(
            code_hash  = code_hash,
            is_active  = True,
            max_uses   = args.max_uses,
            expires_at = expires_at,
            created_by = args.created_by or "cli",
        )
        db.add(inv)
        db.commit()
        db.refresh(inv)

        print("=" * 60)
        print("INVITATION CODE CREATED")
        print("=" * 60)
        print(f"  ID         : {inv.id}")
        print(f"  Plain code : {plain_code}")   # shown ONCE — not stored
        print(f"  Max uses   : {inv.max_uses}")
        print(f"  Expires at : {expires_at or 'never'}")
        print(f"  Created by : {inv.created_by}")
        print("=" * 60)
        print("Share the plain code with the player. It cannot be recovered later.")

    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
