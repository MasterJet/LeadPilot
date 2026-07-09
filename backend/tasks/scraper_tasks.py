import asyncio
import json
import time
import os
import logging

from core.worker import celery
from services.scraper_service import MapsScraper
from core.database import SessionLocal
from models.models import Lead, Campaign

logger = logging.getLogger(__name__)


@celery.task(name="tasks.scraper.scrape_maps")
def scrape_maps_task(campaign_id: int, niche: str, location: str, max_results: int = 20):
    logger.info(f"Scraping campaign={campaign_id} niche={niche} location={location}")
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found")
            return

        existing_leads = db.query(Lead.name).filter(Lead.campaign_id == campaign_id).all()
        skip_names = {l.name for l in existing_leads}

        query = f"{niche} in {location}"
        scraper = MapsScraper(headless=True)
        results = asyncio.run(scraper.scrape_leads(query, max_results, skip_names=skip_names))

        for res in results:
            existing = db.query(Lead).filter(Lead.name == res["name"], Lead.campaign_id == campaign_id).first()
            if existing:
                continue

            new_lead = Lead(
                name=res["name"],
                niche=niche,
                location=location,
                website=res.get("website"),
                phone=res.get("phone"),
                rating=res.get("rating", 0),
                reviews_count=res.get("reviews_count", 0),
                google_maps_url=res.get("google_maps_url"),
                campaign_id=campaign_id,
                status="new"
            )
            db.add(new_lead)
            db.commit()

            website = res.get("website")
            if website:
                from tasks.analyzer_tasks import analyze_website_task
                analyze_website_task.delay(new_lead.id)

        logger.info(f"Finished scraping campaign {campaign_id}. Found {len(results)} leads.")

    except Exception as e:
        logger.error(f"scrape_maps_task failed: {e}")
    finally:
        db.close()


@celery.task(name="tasks.scraper.process_ai_campaign")
def process_ai_campaign_task(campaign_id: int):
    """
    AI-driven multi-location campaign.
    Asks the LLM for a city list and scrapes each city, writing ALL leads
    into the single campaign (no sub-campaigns).
    """
    logger.info(f"Starting AI campaign {campaign_id}")
    db = SessionLocal()
    try:
        from models.models import LLMKey
        from services.ai_service import AIService

        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            logger.error(f"AI campaign {campaign_id} not found")
            return

        # Pick the user's LLM key (first valid one)
        llm_key = (
            db.query(LLMKey)
            .filter(LLMKey.user_id == campaign.user_id, LLMKey.is_valid == True)
            .first()
        )
        ai = AIService(api_key=llm_key.api_key, provider=llm_key.provider) if llm_key else AIService()

        searched = json.loads(campaign.searched_locations) if campaign.searched_locations else []
        pause_secs = int(os.getenv("LEAD_SCRAPER_CITY_PAUSE", "30"))

        while True:
            # -- stop check (outer loop) --
            db.refresh(campaign)
            if campaign.status == "stopped":
                logger.info(f"AI campaign {campaign_id} stopped by user.")
                break

            # -- quota check --
            total_leads = db.query(Lead).filter(Lead.campaign_id == campaign_id).count()
            if total_leads >= campaign.target_leads:
                campaign.status = "completed"
                db.commit()
                logger.info(f"AI campaign {campaign_id} reached target {campaign.target_leads}.")
                break

            remaining = campaign.target_leads - total_leads
            logger.info(f"AI campaign {campaign_id}: need {remaining} more leads. Asking LLM...")

            # -- ask LLM --
            llm_response = ai.generate_macro_locations(campaign.ai_prompt, previously_searched=searched)
            if not llm_response or not llm_response.get("locations"):
                logger.warning("LLM returned no locations. Stopping.")
                campaign.status = "stopped"
                db.commit()
                break

            niche = llm_response.get("niche", campaign.niche)
            locations = llm_response.get("locations", [])
            logger.info(f"LLM suggested: {locations}")

            new_searched = 0

            for loc in locations:
                if loc in searched:
                    continue

                # -- stop check (inner loop) --
                db.refresh(campaign)
                if campaign.status == "stopped":
                    logger.info(f"AI campaign {campaign_id} stopped (inner loop).")
                    break

                # -- quota check (inner loop) --
                total_leads = db.query(Lead).filter(Lead.campaign_id == campaign_id).count()
                if total_leads >= campaign.target_leads:
                    break

                logger.info(f"AI campaign {campaign_id}: scraping '{niche}' in '{loc}'")

                # Scrape directly into the SAME campaign (no sub-campaigns)
                try:
                    existing_names = {n for (n,) in db.query(Lead.name).filter(Lead.campaign_id == campaign_id).all()}
                    query = f"{niche} in {loc}"
                    scraper = MapsScraper(headless=True)
                    results = asyncio.run(scraper.scrape_leads(query, max_results=-1, skip_names=existing_names))

                    for res in results:
                        if db.query(Lead).filter(Lead.name == res["name"], Lead.campaign_id == campaign_id).first():
                            continue
                        lead = Lead(
                            name=res["name"],
                            niche=niche,
                            location=loc,
                            website=res.get("website"),
                            phone=res.get("phone"),
                            rating=res.get("rating", 0),
                            reviews_count=res.get("reviews_count", 0),
                            google_maps_url=res.get("google_maps_url"),
                            campaign_id=campaign_id,
                            status="new"
                        )
                        db.add(lead)
                        db.commit()
                        if res.get("website"):
                            from tasks.analyzer_tasks import analyze_website_task
                            analyze_website_task.delay(lead.id)

                except Exception as e:
                    logger.error(f"Error scraping '{loc}': {e}")

                searched.append(loc)
                campaign.searched_locations = json.dumps(searched)
                db.commit()
                new_searched += 1

                logger.info(f"Cooling down {pause_secs}s before next city...")
                time.sleep(pause_secs)

            if new_searched == 0:
                logger.warning("No new locations were scraped. Stopping to prevent infinite loop.")
                campaign.status = "stopped"
                db.commit()
                break

    except Exception as e:
        logger.error(f"process_ai_campaign_task {campaign_id} failed: {e}")
        try:
            c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if c:
                c.status = "stopped"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
