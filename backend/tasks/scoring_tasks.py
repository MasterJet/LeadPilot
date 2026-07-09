from core.worker import celery
from core.database import SessionLocal
from services.scoring_service import ScoringEngine
import logging

logger = logging.getLogger(__name__)

@celery.task(name="tasks.scoring.score_lead")
def score_lead_task(lead_id: int):
    db = SessionLocal()
    try:
        engine = ScoringEngine()
        score = engine.calculate_score(db, lead_id)
        logger.info(f"Lead {lead_id} scored: {score}")
    except Exception as e:
        logger.error(f"Scoring task failed for lead {lead_id}: {e}")
    finally:
        db.close()
