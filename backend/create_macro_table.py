from core.database import engine, Base
from models import models

# Create all tables
Base.metadata.create_all(bind=engine)
print("Tables updated.")
