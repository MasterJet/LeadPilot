"""
Migration: Add unified AI campaign fields to campaigns table.
Run once: docker compose exec -T backend python /app/alter_campaigns.py
"""
from core.database import engine
from sqlalchemy import text

steps = [
    ("Add is_ai_driven column",
     "ALTER TABLE campaigns ADD COLUMN is_ai_driven BOOLEAN NOT NULL DEFAULT FALSE;"),
    ("Add ai_prompt column",
     "ALTER TABLE campaigns ADD COLUMN ai_prompt TEXT NULL;"),
    ("Add target_leads column",
     "ALTER TABLE campaigns ADD COLUMN target_leads INT NOT NULL DEFAULT 20;"),
    ("Add searched_locations column",
     "ALTER TABLE campaigns ADD COLUMN searched_locations TEXT NULL;"),
    ("Drop macro_campaign_id FK constraint",
     "ALTER TABLE campaigns DROP FOREIGN KEY campaigns_ibfk_3;"),
    ("Drop macro_campaign_id column",
     "ALTER TABLE campaigns DROP COLUMN macro_campaign_id;"),
    ("Drop macro_campaigns table",
     "DROP TABLE IF EXISTS macro_campaigns;"),
]

with engine.begin() as conn:
    for description, sql in steps:
        try:
            conn.execute(text(sql))
            print(f"  ✓ {description}")
        except Exception as e:
            print(f"  ⚠ {description} — skipped ({e})")

print("\nMigration complete.")
