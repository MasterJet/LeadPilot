import asyncio
import urllib.parse
from playwright.async_api import async_playwright
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MapsScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless

    async def scrape_leads(self, query: str, max_results: int = 20, skip_names: set = None) -> List[Dict]:
        leads = []
        skip_names = skip_names or set()
        seen_names = set(skip_names) # Include existing names in seen to skip them
        seen_urls = set()
        
        stats = {
            "total_listings_found": 0,
            "new_leads_collected": 0,
            "skipped_duplicates": 0,
            "skipped_ads": 0,
            "failed_extractions": 0
        }
        
        target_max = 999999 if max_results == -1 else max_results
        display_max = "MAX" if max_results == -1 else max_results

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                locale="en-US",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                record_video_dir="/app/recordings/"
            )
            # Inject SOCS cookie to bypass Google Consent page
            try:
                await context.add_cookies([
                    {
                        "name": "SOCS",
                        "value": "CAISHAgBEhJnd3NfMjAyNDA2MjEtMF8SQzEaBmVuIAEaBgiAsd-yBq",
                        "domain": ".google.com",
                        "path": "/",
                    }
                ])
            except Exception as e:
                logger.warning(f"Failed to add consent cookie: {e}")

            page = await context.new_page()

            encoded_query = urllib.parse.quote_plus(query)
            search_url = f"https://www.google.com/maps/search/{encoded_query}"
            logger.info(f"Searching for: {query}")
            
            try:
                await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
            except Exception as e:
                logger.error(f"Failed to load Google Maps: {e}")
                await browser.close()
                return leads
            
            # Handle Consent Page
            try:
                consent_selectors = [
                    'button[aria-label="Accept all"]',
                    'button:has-text("Accept all")',
                    'button:has-text("I agree")',
                    'button:has-text("Alle akzeptieren")',
                    'button:has-text("Ich stimme zu")',
                    'button:has-text("Tout accepter")',
                    'button:has-text("Aceptar todo")',
                    'button:has-text("Aceptar todas")',
                    'button:has-text("Accetta tutto")',
                    'button:has-text("Alles accepteren")',
                    'button:has-text("Zaakceptuj wszystko")',
                    'button:has-text("Zgadzam się")',
                    'button:has-text("Aceitar tudo")',
                    'button:has-text("Принять всё")'
                ]
                for selector in consent_selectors:
                    btn = page.locator(selector)
                    if await btn.count() > 0 and await btn.first.is_visible():
                        await btn.first.click()
                        await page.wait_for_load_state("networkidle")
                        break
            except: pass

            # Wait for results
            try:
                await page.wait_for_selector('div[role="feed"], a.hfpxzc, h1.DUwDvf', timeout=20000)
            except Exception as e:
                logger.warning(f"Results not found: {e}")
                logger.warning(f"Current page URL: {page.url}")
                try:
                    logger.warning(f"Current page Title: {await page.title()}")
                    import os
                    screenshot_dir = "/app/recordings"
                    os.makedirs(screenshot_dir, exist_ok=True)
                    screenshot_path = os.path.join(screenshot_dir, "debug_no_results.png")
                    await page.screenshot(path=screenshot_path)
                    logger.warning(f"Saved debug screenshot to {screenshot_path}")
                except Exception as ex:
                    logger.error(f"Failed to save debug info: {ex}")
                await browser.close()
                return leads

            last_processed_index = 0
            reached_end = False

            while len(leads) < target_max and not reached_end:
                await asyncio.sleep(1) # Safety delay
                # --- Phase 1: Robust Scrolling ---
                # We scroll until we have enough listings or we hit the absolute end
                if not (await page.locator('h1.DUwDvf').count() > 0 and await page.locator('a.hfpxzc, a[href*="/maps/place/"]').count() == 0):
                    feed = await page.query_selector('div[role="feed"]')
                    stale_count = 0
                    prev_count = 0
                    target_to_find = target_max + len(skip_names)

                    logger.info(f"Scrolling for more results (Current: {len(leads)}/{display_max})...")

                    while True:
                        listing_links = await page.query_selector_all('a.hfpxzc, a[href*="/maps/place/"]')
                        current_count = len(listing_links)
                        
                        if current_count > last_processed_index:
                            # Break if we have enough total to hit the target
                            if current_count >= target_to_find:
                                break
                            # Or if we've found a good batch of new ones to process
                            if current_count >= last_processed_index + 20:
                                break
                        
                        if current_count == prev_count:
                            stale_count += 1
                            if feed: await feed.evaluate("el => el.scrollBy(0, 5000)")
                            else: await page.mouse.wheel(0, 5000)
                        else:
                            stale_count = 0
                        
                        if stale_count >= 10: 
                            reached_end = True
                            break
                        prev_count = current_count
                        
                        if feed: await feed.evaluate("el => el.scrollTop = el.scrollHeight")
                        else: await page.mouse.wheel(0, 3000)
                        await asyncio.sleep(2)
                        
                        if await page.get_by_text("You've reached the end of the list").is_visible():
                            reached_end = True
                            break

                # --- Phase 2: Processing ---
                listings_locator = page.locator('a.hfpxzc, a[href*="/maps/place/"]')
                total_found = await listings_locator.count()
                stats["total_listings_found"] = total_found
                
                if total_found == 0 and await page.locator('h1.DUwDvf').count() > 0:
                    is_single = True
                    total_found = 1
                else:
                    is_single = False

                for i in range(last_processed_index, total_found):
                    if len(leads) >= target_max: break
                    
                    try:
                        if not is_single:
                            listing = listings_locator.nth(i)
                            try: await listing.scroll_into_view_if_needed(timeout=5000)
                            except: 
                                last_processed_index = i + 1
                                continue

                            listing_text = await listing.inner_text()
                            if "Ad ·" in listing_text or "Sponsored" in listing_text:
                                stats["skipped_ads"] += 1
                                last_processed_index = i + 1
                                continue

                            aria_label = await listing.get_attribute('aria-label')
                            expected_name = aria_label.split('·')[0].strip() if aria_label else (listing_text.split('\n')[0].strip() if listing_text else "Unknown")
                            maps_url = await listing.get_attribute('href') or ""
                            
                            if expected_name in seen_names and expected_name != "Unknown":
                                stats["skipped_duplicates"] += 1
                                logger.info(f"Skipping duplicate: {expected_name}")
                                last_processed_index = i + 1
                                continue
                                
                            await listing.click(timeout=5000)
                            await asyncio.sleep(2.5)
                        else:
                            expected_name = "Unknown"
                            maps_url = page.url

                        name_el = page.locator('h1.DUwDvf')
                        try: await name_el.first.wait_for(state="visible", timeout=5000)
                        except: pass

                        name = expected_name
                        if await name_el.count() > 0:
                            panel_name = (await name_el.first.inner_text()).strip()
                            if panel_name: name = panel_name
                        
                        if not name or name == "Unknown":
                            stats["failed_extractions"] += 1
                            last_processed_index = i + 1
                            continue

                        if name in seen_names:
                            stats["skipped_duplicates"] += 1
                            logger.info(f"Skipping duplicate (Panel): {name}")
                            last_processed_index = i + 1
                            continue
                        
                        url_id = maps_url.split('?')[0] if maps_url else ""
                        if url_id and url_id in seen_urls:
                            stats["skipped_duplicates"] += 1
                            logger.info(f"Skipping duplicate URL: {url_id}")
                            last_processed_index = i + 1
                            continue
                        
                        seen_names.add(name)
                        if url_id: seen_urls.add(url_id)

                        details = {"name": name, "google_maps_url": maps_url or page.url}
                        
                        async def get_val(sel, attr=None):
                            try:
                                el = page.locator(sel).first
                                if await el.count() > 0:
                                    return await el.get_attribute(attr) if attr else (await el.inner_text()).strip()
                            except: return None
                            return None

                        raw_website = await get_val('a[data-item-id="authority"]', 'href')
                        if raw_website:
                            try:
                                parsed = urllib.parse.urlparse(raw_website)
                                details["website"] = f"{parsed.scheme}://{parsed.netloc}"
                            except Exception:
                                details["website"] = raw_website
                        else:
                            details["website"] = None
                        p_id = await get_val('button[data-item-id*="phone:tel:"]', 'data-item-id')
                        if p_id: details["phone"] = p_id.replace('phone:tel:', '')
                        details["address"] = await get_val('button[data-item-id="address"]')
                        
                        r_text = await get_val('div.F7nice span[aria-hidden="true"]')
                        if r_text:
                            try: details["rating"] = float(r_text.replace(',', '.'))
                            except: pass

                        rev_text = await get_val('div.F7nice span[aria-label*="review"]', 'aria-label')
                        if rev_text:
                            try: details["reviews_count"] = int(''.join(filter(str.isdigit, rev_text)))
                            except: pass

                        leads.append(details)
                        stats["new_leads_collected"] += 1
                        logger.info(f"Collected [{len(leads)}/{display_max}]: {name}")

                    except Exception as e:
                        logger.error(f"Error at listing {i+1}: {e}")
                        stats["failed_extractions"] += 1
                    
                    last_processed_index = i + 1
                
                if is_single: reached_end = True
                
                # Reset page to search results to close detail pane and avoid scroll lock
                if not reached_end and len(leads) < target_max:
                    await page.goto(search_url)
                    await asyncio.sleep(2)

            await browser.close()
        
        logger.info(f"Scraping completed for '{query}'")
        logger.info(f"Total Listings Seen:   {stats['total_listings_found']}")
        logger.info(f"New Leads Collected:   {stats['new_leads_collected']}/{display_max}")
        logger.info(f"Skipped Duplicates:    {stats['skipped_duplicates']}")
        logger.info(f"Skipped Ads:           {stats['skipped_ads']}")
        logger.info(f"Failed Extractions:    {stats['failed_extractions']}")
        logger.info("----------------------")
        
        return leads
