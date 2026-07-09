from sqlalchemy.orm import Session
from models.models import Lead
import logging

logger = logging.getLogger(__name__)


class ScoringEngine:
    @staticmethod
    def calculate_score(db: Session, lead_id: int):
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return 0

        campaign = lead.campaign
        if not campaign:
            logger.warning(f"No campaign for lead {lead_id}, skipping score.")
            return 0

        config = campaign
        total = 0

        # Website presence
        if lead.website:
            total += config.weight_has_website
        else:
            total += config.weight_no_website

        # Signal from flat columns (no join needed)
        if lead.has_whatsapp:
            total += config.weight_has_whatsapp

        if not lead.has_chatbot:
            total += config.weight_no_chatbot

        if lead.has_booking_system:
            total += config.weight_has_booking

        # No digital response mechanism at all
        if not lead.has_chatbot and not lead.has_whatsapp:
            total += config.weight_no_response_mechanism

        lead.score = total
        lead.priority = "high" if total >= 15 else "medium" if total >= 8 else "low"
        db.commit()
        return total
