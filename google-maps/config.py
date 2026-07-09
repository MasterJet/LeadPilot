import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    CITY = os.getenv("CITY", "London")
    BUSINESS = os.getenv("BUSINESS", "Salon")
    HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
    MAX_RESULTS = int(os.getenv("MAX_RESULTS", "100"))
    ENABLE_VIDEO = os.getenv("ENABLE_VIDEO", "false").lower() == "true"
    
    DATA_DIR = "data"
    DB_PATH = os.path.join(DATA_DIR, "leads.db")
    EXPORT_DIR = os.path.join(DATA_DIR, "exports")
    VIDEO_DIR = os.path.join(DATA_DIR, "videos")

    @classmethod
    def ensure_dirs(cls):
        os.makedirs(cls.DATA_DIR, exist_ok=True)
        os.makedirs(cls.EXPORT_DIR, exist_ok=True)
        os.makedirs(cls.VIDEO_DIR, exist_ok=True)
