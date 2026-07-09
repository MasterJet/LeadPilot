from core.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN macro_campaign_id INT NULL;"))
        conn.execute(text("ALTER TABLE campaigns ADD FOREIGN KEY (macro_campaign_id) REFERENCES macro_campaigns(id);"))
        print("Table altered.")
    except Exception as e:
        print("Error or already altered:", e)
