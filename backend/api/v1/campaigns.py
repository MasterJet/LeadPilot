from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from core.database import get_db
from models import models
from core.auth import get_current_user
from schemas import schemas

router = APIRouter()


# ─── helpers ──────────────────────────────────────────────────────────────────

def _campaign_dict(c: models.Campaign, db: Session) -> dict:
    d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    d["leads_count"] = db.query(models.Lead).filter(models.Lead.campaign_id == c.id).count()
    return d


# ─── list / get ───────────────────────────────────────────────────────────────

@router.get("/")
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaigns = (
        db.query(models.Campaign)
        .filter(models.Campaign.user_id == current_user.id)
        .all()
    )
    return [_campaign_dict(c, db) for c in campaigns]


# Thin compatibility shim so the Auto-Pilot page still works while we migrate the UI
@router.get("/macro/list")
def list_ai_campaigns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return AI-driven campaigns (formerly called 'macro campaigns')."""
    campaigns = (
        db.query(models.Campaign)
        .filter(
            models.Campaign.user_id == current_user.id,
            models.Campaign.is_ai_driven == True,
        )
        .all()
    )
    results = []
    for c in campaigns:
        d = _campaign_dict(c, db)
        # Auto-Pilot page expects these field names
        d["leads_collected"] = d["leads_count"]
        d["prompt"] = c.ai_prompt
        results.append(d)
    return results


# ─── create ───────────────────────────────────────────────────────────────────

class CreateCampaignBody(BaseModel):
    name: str
    niche: str
    # Manual mode
    location: Optional[str] = None
    llm_key_id: Optional[int] = None
    prompt_instructions: Optional[str] = None
    # AI mode
    is_ai_driven: bool = False
    ai_prompt: Optional[str] = None
    target_leads: int = 20
    # Scoring weights
    weight_has_website: Optional[int] = None
    weight_no_website: Optional[int] = None
    weight_has_whatsapp: Optional[int] = None
    weight_no_chatbot: Optional[int] = None
    weight_has_booking: Optional[int] = None
    weight_no_response_mechanism: Optional[int] = None


@router.post("/")
def create_campaign(
    data: CreateCampaignBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign_data: dict = {
        "name": data.name,
        "niche": data.niche,
        "location": data.location or "AI Managed",
        "llm_key_id": data.llm_key_id,
        "prompt_instructions": data.prompt_instructions,
        "user_id": current_user.id,
        "is_ai_driven": data.is_ai_driven,
        "ai_prompt": data.ai_prompt,
        "target_leads": data.target_leads,
        "searched_locations": "[]",
        "status": "active",
    }

    # Override scoring weights if provided
    for field in [
        "weight_has_website", "weight_no_website", "weight_has_whatsapp",
        "weight_no_chatbot", "weight_has_booking", "weight_no_response_mechanism",
    ]:
        v = getattr(data, field)
        if v is not None:
            campaign_data[field] = v

    campaign = models.Campaign(**campaign_data)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Fire the appropriate background task
    if data.is_ai_driven:
        from tasks.scraper_tasks import process_ai_campaign_task
        process_ai_campaign_task.delay(campaign.id)
    else:
        from tasks.scraper_tasks import scrape_maps_task
        scrape_maps_task.delay(campaign.id, data.niche, campaign.location, data.target_leads)

    return _campaign_dict(campaign, db)


# Compatibility shim so the Auto-Pilot page "New Objective" button still works
class MacroCampaignCreate(BaseModel):
    name: str
    prompt: str
    target_leads: int
    niche: str

@router.post("/macro/create")
def create_macro_campaign(
    data: MacroCampaignCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = models.Campaign(
        name=data.name,
        niche=data.niche,
        location="AI Managed",
        user_id=current_user.id,
        is_ai_driven=True,
        ai_prompt=data.prompt,
        target_leads=data.target_leads,
        searched_locations="[]",
        status="active",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    from tasks.scraper_tasks import process_ai_campaign_task
    process_ai_campaign_task.delay(campaign.id)

    d = _campaign_dict(campaign, db)
    d["leads_collected"] = 0
    d["prompt"] = campaign.ai_prompt
    return d


# ─── stop ─────────────────────────────────────────────────────────────────────

@router.post("/{campaign_id}/stop")
def stop_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id,
        models.Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = "stopped"
    db.commit()
    return {"message": "Campaign stopped"}


# Compatibility shim for old Auto-Pilot page URL
@router.post("/macro/{campaign_id}/stop")
def stop_macro_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return stop_campaign(campaign_id, db, current_user)


# ─── update ───────────────────────────────────────────────────────────────────

@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    name: Optional[str] = None,
    niche: Optional[str] = None,
    location: Optional[str] = None,
    llm_key_id: Optional[int] = None,
    prompt_instructions: Optional[str] = None,
    weights: Optional[schemas.ScoringConfigBase] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id,
        models.Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if name is not None: campaign.name = name
    if niche is not None: campaign.niche = niche
    if location is not None: campaign.location = location
    if llm_key_id is not None:
        campaign.llm_key_id = None if llm_key_id == -1 else llm_key_id
    if prompt_instructions is not None: campaign.prompt_instructions = prompt_instructions

    if weights:
        for field in [
            "weight_has_website", "weight_no_website", "weight_has_whatsapp",
            "weight_no_chatbot", "weight_has_booking", "weight_no_response_mechanism",
        ]:
            v = getattr(weights, field, None)
            if v is not None:
                setattr(campaign, field, v)

    db.commit()
    db.refresh(campaign)
    return _campaign_dict(campaign, db)


# ─── delete ───────────────────────────────────────────────────────────────────

def _delete_campaign_cascade(campaign_id: int, db: Session):
    lead_ids = [
        lid for (lid,) in db.query(models.Lead.id).filter(models.Lead.campaign_id == campaign_id).all()
    ]
    if lead_ids:
        db.query(models.Message).filter(models.Message.lead_id.in_(lead_ids)).delete(synchronize_session=False)
        db.query(models.Activity).filter(models.Activity.lead_id.in_(lead_ids)).delete(synchronize_session=False)
        db.query(models.Lead).filter(models.Lead.id.in_(lead_ids)).delete(synchronize_session=False)


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id,
        models.Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    _delete_campaign_cascade(campaign_id, db)
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted"}


# Compatibility shim for old Auto-Pilot delete URL
@router.delete("/macro/{campaign_id}")
def delete_macro_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return delete_campaign(campaign_id, db, current_user)


# ─── stats ────────────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/stats")
def get_campaign_stats(campaign_id: int, db: Session = Depends(get_db)):
    total_leads = db.query(models.Lead).filter(models.Lead.campaign_id == campaign_id).count()
    contacted = db.query(models.Lead).filter(
        models.Lead.campaign_id == campaign_id,
        models.Lead.status == "contacted",
    ).count()
    replied = db.query(models.Lead).filter(
        models.Lead.campaign_id == campaign_id,
        models.Lead.status == "replied",
    ).count()
    return {
        "total_leads": total_leads,
        "contacted": contacted,
        "replied": replied,
        "conversion_rate": (replied / contacted * 100) if contacted > 0 else 0,
    }
