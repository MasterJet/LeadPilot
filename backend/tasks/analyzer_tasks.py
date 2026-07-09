import asyncio
import json
import logging
from datetime import datetime, timezone

from core.worker import celery
from core.database import SessionLocal
from models.models import Lead
from services.analyzer_service import WebsiteAnalyzer

logger = logging.getLogger(__name__)


@celery.task(name="tasks.analyzer.analyze_website")
def analyze_website_task(lead_id: int):
    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead or not lead.website:
            return

        analyzer = WebsiteAnalyzer(headless=True)
        result = asyncio.run(analyzer.analyze(lead.website))

        # ── Write flat filterable columns directly to lead ─────────────────
        lead.email = result.get("email")
        lead.has_whatsapp = result.get("has_whatsapp", False)
        lead.has_chatbot = result.get("has_chatbot", False)
        lead.has_booking_system = result.get("has_booking_system", False)
        lead.has_facebook = result.get("has_facebook", False)
        lead.has_instagram = result.get("has_instagram", False)
        lead.cms_name = result.get("cms_name")
        lead.analysis_json = json.dumps(result.get("analysis_json", {}))
        lead.analyzed_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"Analysis complete for lead {lead_id} ({lead.name})")

        # ── Trigger re-scoring ─────────────────────────────────────────────
        from tasks.scoring_tasks import score_lead_task
        score_lead_task.delay(lead_id)

    except Exception as e:
        logger.error(f"analyze_website_task failed for lead {lead_id}: {e}")
    finally:
        db.close()
