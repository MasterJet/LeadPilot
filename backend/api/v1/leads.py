from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from core.database import get_db
from models import models
from schemas import schemas
from core.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.LeadResponse])
def get_leads(
    campaign_id: Optional[int] = None,
    niche: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    has_website: Optional[bool] = None,
    has_email: Optional[bool] = None,
    has_whatsapp: Optional[bool] = None,
    cms_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Lead).join(models.Campaign).filter(
        models.Campaign.user_id == current_user.id
    )
    if campaign_id:
        query = query.filter(models.Lead.campaign_id == campaign_id)
    if niche:
        query = query.filter(models.Lead.niche == niche)
    if location:
        query = query.filter(models.Lead.location == location)
    if status:
        query = query.filter(models.Lead.status == status)
    if has_website is not None:
        if has_website:
            query = query.filter(models.Lead.website.isnot(None))
        else:
            query = query.filter(models.Lead.website.is_(None))
    if has_email is not None:
        if has_email:
            query = query.filter(models.Lead.email.isnot(None))
        else:
            query = query.filter(models.Lead.email.is_(None))
    if has_whatsapp is not None:
        query = query.filter(models.Lead.has_whatsapp == has_whatsapp)
    if cms_name:
        query = query.filter(models.Lead.cms_name.ilike(f"%{cms_name}%"))

    return query.order_by(models.Lead.score.desc()).all()


@router.get("/{lead_id}", response_model=schemas.LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db),
             current_user: models.User = Depends(get_current_user)):
    lead = db.query(models.Lead).join(models.Campaign).filter(
        models.Lead.id == lead_id,
        models.Campaign.user_id == current_user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("/{lead_id}/generate-message")
def generate_message(lead_id: int, db: Session = Depends(get_db),
                     current_user: models.User = Depends(get_current_user)):
    from services.ai_service import AIService
    lead = db.query(models.Lead).join(models.Campaign).filter(
        models.Lead.id == lead_id,
        models.Campaign.user_id == current_user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    api_key = None
    provider = "openai"
    if lead.campaign and lead.campaign.llm_key:
        api_key = lead.campaign.llm_key.api_key
        provider = lead.campaign.llm_key.provider

    ai_service = AIService(api_key=api_key, provider=provider)
    custom_instructions = lead.campaign.prompt_instructions if lead.campaign else None
    message = ai_service.generate_outreach(lead, custom_instructions=custom_instructions)

    new_message = models.Message(
        lead_id=lead_id,
        message_text=message,
        type="initial",
        status="draft",
    )
    db.add(new_message)
    db.commit()
    return {"message": message}


@router.patch("/{lead_id}/status")
def update_lead_status(lead_id: int, status: str, db: Session = Depends(get_db),
                       current_user: models.User = Depends(get_current_user)):
    lead = db.query(models.Lead).join(models.Campaign).filter(
        models.Lead.id == lead_id,
        models.Campaign.user_id == current_user.id
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = status
    db.commit()
    return {"message": f"Status updated to {status}"}


@router.post("/scrape")
def trigger_scrape(campaign_id: int, niche: str, location: str, max_results: int = 20):
    from tasks.scraper_tasks import scrape_maps_task
    scrape_maps_task.delay(campaign_id, niche, location, max_results)
    return {"message": "Scraping task started"}
