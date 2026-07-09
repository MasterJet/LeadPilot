"""
Migration: Flatten LeadAnalysis into Lead table.
Run: docker compose exec -T backend python /app/migrate_flatten_leads.py
"""
from core.database import engine
from sqlalchemy import text

steps = [
    # Drop the old lead_analysis table
    ("Drop lead_analysis table",
     "DROP TABLE IF EXISTS lead_analysis;"),

    # Drop all existing leads (user confirmed clean slate)
    ("Truncate existing leads",
     "DELETE FROM leads;"),

    # Add new flat columns to leads
    ("Add email column",
     "ALTER TABLE leads ADD COLUMN email VARCHAR(255) NULL;"),
    ("Add has_whatsapp column",
     "ALTER TABLE leads ADD COLUMN has_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;"),
    ("Add has_chatbot column",
     "ALTER TABLE leads ADD COLUMN has_chatbot BOOLEAN NOT NULL DEFAULT FALSE;"),
    ("Add has_booking_system column",
     "ALTER TABLE leads ADD COLUMN has_booking_system BOOLEAN NOT NULL DEFAULT FALSE;"),
    ("Add has_facebook column",
     "ALTER TABLE leads ADD COLUMN has_facebook BOOLEAN NOT NULL DEFAULT FALSE;"),
    ("Add has_instagram column",
     "ALTER TABLE leads ADD COLUMN has_instagram BOOLEAN NOT NULL DEFAULT FALSE;"),
    ("Add cms_name column",
     "ALTER TABLE leads ADD COLUMN cms_name VARCHAR(100) NULL;"),
    ("Add analyzed_at column",
     "ALTER TABLE leads ADD COLUMN analyzed_at DATETIME NULL;"),
    ("Add analysis_json column",
     "ALTER TABLE leads ADD COLUMN analysis_json LONGTEXT NULL;"),
]

with engine.begin() as conn:
    for description, sql in steps:
        try:
            conn.execute(text(sql))
            print(f"  ✓ {description}")
        except Exception as e:
            print(f"  ⚠ {description} — skipped ({e})")

print("\nMigration complete.")
