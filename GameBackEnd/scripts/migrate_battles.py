"""
One-time migration: add boss_id and type columns to battles table.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "dev.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(battles)")
cols = [row[1] for row in cur.fetchall()]
print("Current battles columns:", cols)

added = []

if "boss_id" not in cols:
    cur.execute("ALTER TABLE battles ADD COLUMN boss_id VARCHAR")
    added.append("boss_id")

if "type" not in cols:
    cur.execute("ALTER TABLE battles ADD COLUMN type VARCHAR(10) DEFAULT 'pvp'")
    added.append("type")

conn.commit()

cur.execute("PRAGMA table_info(battles)")
print("Updated battles columns:", [row[1] for row in cur.fetchall()])
print("Added:", added if added else "None (already existed)")
conn.close()
