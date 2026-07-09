import sqlite3
from config import Config
from datetime import datetime

class Database:
    def __init__(self, db_path=Config.DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS businesses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    address TEXT,
                    phone TEXT,
                    website TEXT,
                    has_website BOOLEAN,
                    maps_url TEXT UNIQUE,
                    city TEXT,
                    business_type TEXT,
                    scraped_at TEXT,
                    review_count TEXT
                )
            ''')
            conn.commit()

    def insert_business(self, data):
        # Skip if name is Unknown
        if data.get('name') == "Unknown":
            return False

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Check for duplicates by name and address
            cursor.execute('SELECT id FROM businesses WHERE name = ? AND address = ?', (data.get('name'), data.get('address')))
            if cursor.fetchone():
                return False
                
            try:
                cursor.execute('''
                    INSERT INTO businesses (
                        name, address, phone, website, has_website, 
                        maps_url, city, business_type, scraped_at, review_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data.get('name'),
                    data.get('address'),
                    data.get('phone'),
                    data.get('website'),
                    data.get('has_website'),
                    data.get('maps_url'),
                    data.get('city'),
                    data.get('business_type'),
                    datetime.now().isoformat(),
                    data.get('review_count', '')
                ))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                # Already exists
                return False

    def get_all_for_export(self, city, business_type):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM businesses 
                WHERE city = ? AND business_type = ?
            ''', (city, business_type))
            return [dict(row) for row in cursor.fetchall()]
