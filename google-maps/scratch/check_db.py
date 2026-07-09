import sqlite3
import os

db_path = "/home/coder/DevWork/projects/LeadPilot/google-maps/data/leads.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name, COUNT(*) FROM businesses GROUP BY name HAVING COUNT(*) > 1")
    rows = cursor.fetchall()
    if rows:
        print("Duplicates found:")
        for row in rows:
            print(f"{row[0]}: {row[1]}")
    else:
        print("No duplicates found in database.")
    conn.close()
else:
    print("Database not found.")
