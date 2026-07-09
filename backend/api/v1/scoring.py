from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from models import models
from schemas import schemas

from core.auth import get_current_user

router = APIRouter()

@router.post("/recalculate")
def recalculate_all_scores(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Trigger a recalculation of all lead scores for the current user's campaigns.
    """
    from tasks.scoring_tasks import score_lead_task
    # Filter leads by user ownership
    leads = db.query(models.Lead).join(models.Campaign).filter(models.Campaign.user_id == current_user.id).all()
    for lead in leads:
        score_lead_task.delay(lead.id)
    
    return {"message": f"Started recalculation for {len(leads)} leads"}
