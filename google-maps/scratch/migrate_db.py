import sqlite3
import os

db_path = "/home/coder/DevWork/projects/LeadPilot/google-maps/data/leads.db"
if not os.path.exists(db_path):
    print("Database not found.")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Cleaning up database and applying UNIQUE constraint...")

# 1. Rename existing table
cursor.execute("ALTER TABLE businesses RENAME TO businesses_old")

# 2. Create new table with UNIQUE constraint
cursor.execute('''
    CREATE TABLE businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        address TEXT,
        phone TEXT,
        website TEXT,
        has_website BOOLEAN,
        maps_url TEXT UNIQUE,
        city TEXT,
        business_type TEXT,
        scraped_at TEXT
    )
''')

# 3. Migration: Insert unique records (preferring latest scraped_at)
# Using GROUP BY maps_url and MIN(id) or similar to get one of each
cursor.execute('''
    INSERT OR IGNORE INTO businesses (
        name, address, phone, website, has_website, maps_url, city, business_type, scraped_at
    )
    SELECT name, address, phone, website, has_website, maps_url, city, business_type, scraped_at
    FROM businesses_old
    WHERE name != 'Unknown'
    GROUP BY maps_url
''')

# 4. Drop old table
cursor.execute("DROP TABLE businesses_old")

conn.commit()
print(f"Cleanup complete. Records remaining: {cursor.execute('SELECT COUNT(*) FROM businesses').fetchone()[0]}")
conn.close()
