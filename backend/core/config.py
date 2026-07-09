import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LeadPilot API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost/leadpilot")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()
