from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, SessionLocal
from models import models
from api.v1 import leads, campaigns, scoring, auth, llm_keys

import time
from sqlalchemy.exc import OperationalError

from core.auth import get_password_hash

# Create tables with retry logic to wait for DB
def init_db():
    retries = 5
    while retries > 0:
        try:
            models.Base.metadata.create_all(bind=engine)
            
            # Seed Admin User
            db = SessionLocal()
            admin_user = db.query(models.User).filter(models.User.email == "Admin").first()
            if not admin_user:
                hashed_pw = get_password_hash("AgentsArcade")
                new_admin = models.User(
                    email="Admin", 
                    hashed_password=hashed_pw,
                    is_admin=True
                )
                db.add(new_admin)
                db.commit()
                print("Default Admin user created.")
            db.close()
            
            print("Database connected and tables created!")
            break
        except OperationalError:
            retries -= 1
            print(f"Database not ready. Retrying in 5 seconds... ({retries} retries left)")
            time.sleep(5)

init_db()

app = FastAPI(title="LeadPilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to LeadPilot API", "status": "running"}

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["Leads"])
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["Campaigns"])
app.include_router(scoring.router, prefix="/api/v1/scoring", tags=["Scoring"])
app.include_router(llm_keys.router, prefix="/api/v1/llm-keys", tags=["LLM Keys"])
