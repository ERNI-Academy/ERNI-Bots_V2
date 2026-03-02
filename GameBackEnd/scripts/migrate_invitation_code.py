"""
Migration: rename invitation_codes.code_hash → code (if needed)
            + replace ALL existing codes with fresh plain-text codes.

Run once from GameBackEnd/:
    python scripts/migrate_invitation_code.py

Steps performed:
  1. Rename column  code_hash → code  (skipped if already done).
  2. Generate a new random code for every row in invitation_codes.
  3. Print a full report so you can distribute the new codes.

The report is also saved to:  scripts/invitation_codes_report.txt
"""

import os
import sys
import secrets
import string
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db import engine
import db.models  # noqa: F401  — register models with Base


# ── helpers ───────────────────────────────────────────────────────────────────

def _gen_code(length: int = 32) -> str:
    """Cryptographically random code: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"""
    alphabet = string.ascii_uppercase + string.digits
    raw = "".join(secrets.choice(alphabet) for _ in range(length))
    return "-".join(raw[i:i + 8] for i in range(0, len(raw), 8))


def _get_columns(conn) -> list:
    if engine.dialect.name == "sqlite":
        result = conn.execute(text("PRAGMA table_info(invitation_codes)")).fetchall()
        return [row[1] for row in result]
    else:
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'invitation_codes'"
        )).fetchall()
        return [row[0] for row in result]


# ── step 1: rename column if needed ──────────────────────────────────────────

def _ensure_column_renamed(conn):
    columns = _get_columns(conn)
    if "code_hash" in columns:
        print("  → Renaming column code_hash → code ...")
        conn.execute(text(
            "ALTER TABLE invitation_codes RENAME COLUMN code_hash TO code"
        ))
        conn.commit()
        print("  ✓ Column renamed.")
    elif "code" in columns:
        print("  ✓ Column already named 'code'. Skipping rename.")
    else:
        print("  ✗ Neither code_hash nor code column found. Aborting.")
        sys.exit(1)


# ── step 2 & 3: regenerate codes + build report ───────────────────────────────

def _regenerate_codes(conn) -> list:
    rows = conn.execute(text(
        "SELECT ic.id, ic.player_id, ic.is_active, ic.current_uses, ic.max_uses, "
        "       ic.expires_at, p.username "
        "FROM invitation_codes ic "
        "LEFT JOIN players p ON p.id = ic.player_id "
        "ORDER BY ic.is_active DESC, p.username ASC"
    )).fetchall()

    report = []
    for row in rows:
        new_code = _gen_code()
        conn.execute(
            text("UPDATE invitation_codes SET code = :code WHERE id = :id"),
            {"code": new_code, "id": row[0]},
        )
        report.append({
            "id":        row[0],
            "username":  row[6] or "(unclaimed)",
            "new_code":  new_code,
            "is_active": row[2],
            "uses":      f"{row[3]}/{row[4]}",
            "expires":   str(row[5])[:10] if row[5] else "never",
        })

    conn.commit()
    return report


# ── print + save report ───────────────────────────────────────────────────────

def _print_report(report: list):
    sep = "─" * 105
    header = f"{'PLAYER':<25} {'ACTIVE':<8} {'USES':<6} {'EXPIRES':<12} {'NEW CODE'}"
    lines = [
        sep,
        f"INVITATION CODES MIGRATION REPORT  —  {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
        f"Total codes regenerated: {len(report)}",
        sep,
        header,
        sep,
    ]
    for r in report:
        active = "YES" if r["is_active"] else "no"
        lines.append(
            f"{r['username']:<25} {active:<8} {r['uses']:<6} {r['expires']:<12} {r['new_code']}"
        )
    lines.append(sep)

    output = "\n".join(lines)
    print("\n" + output + "\n")

    report_path = os.path.join(os.path.dirname(__file__), "invitation_codes_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(output + "\n")
    print(f"Report saved → {report_path}")


# ── main ──────────────────────────────────────────────────────────────────────

def run():
    print("\n=== migrate_invitation_code.py ===\n")

    with engine.connect() as conn:
        print("[1/2] Checking / renaming column ...")
        _ensure_column_renamed(conn)

        print("\n[2/2] Regenerating all invitation codes ...")
        report = _regenerate_codes(conn)
        print(f"  ✓ {len(report)} codes updated.")

    _print_report(report)
    print("\nDone. Distribute the new codes from the report above.\n")


if __name__ == "__main__":
    run()
