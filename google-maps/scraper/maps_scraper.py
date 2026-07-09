import os
import random
import time
import logging
import urllib.parse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from config import Config

def _get_main_domain(url: str) -> str:
    """Return the main domain (e.g., example.com) from a URL.
    Strips subdomains and leading 'www.' if present.
    """
    try:
        netloc = urllib.parse.urlparse(url).netloc
        # Remove port if present
        netloc = netloc.split(':')[0].lower()
        # Strip leading www.
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        
        parts = netloc.split('.')
        if len(parts) >= 3:
            # Common multi-part TLDs (e.g., .co.uk, .com.au, .gov.uk)
            # If the second to last part is very short (2-3 chars), it's likely a TLD part
            if len(parts[-2]) <= 3:
                return '.'.join(parts[-3:])
        
        if len(parts) >= 2:
            return '.'.join(parts[-2:])
        return netloc
    except Exception:
        return ''


logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MapsScraper:
    def __init__(self):
        self.config = Config
        self.results = []

    def _random_delay(self, min_s=1, max_s=3):
        time.sleep(random.uniform(min_s, max_s))

    def _human_scroll(self, page, selector):
        """Scrolls a specific element in a more human-like way."""
        try:
            page.wait_for_selector(selector, state="attached", timeout=10000)
            last_height = page.evaluate(f'document.querySelector(`{selector}`).scrollHeight')
            
            scroll_attempts = 0
            while True:
                current_items = page.locator('a.hfpxzc').count()
                if current_items >= self.config.MAX_RESULTS:
                    break
                
                page.evaluate(f'document.querySelector(`{selector}`).scrollBy(0, 1000)')
                self._random_delay(2, 4)
                
                new_height = page.evaluate(f'document.querySelector(`{selector}`).scrollHeight')
                if new_height == last_height:
                    scroll_attempts += 1
                    if scroll_attempts >= 3:
                        break
                    self._random_delay(3, 5)
                else:
                    scroll_attempts = 0
                    last_height = new_height
        except Exception:
            pass

    def scrape(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.config.HEADLESS)
            
            context_args = {
                "locale": "en-US",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            }
            if self.config.ENABLE_VIDEO:
                context_args["record_video_dir"] = self.config.VIDEO_DIR

            context = browser.new_context(**context_args)
            page = context.new_page()

            try:
                page.goto("https://www.google.com/maps?hl=en", wait_until="load")
                
                # Handle consent
                try:
                    consent_btn = page.get_by_role("button", name="Accept all").or_(page.get_by_role("button", name="I agree"))
                    if consent_btn.is_visible(timeout=3000):
                        consent_btn.click()
                except:
                    pass

                search_query = f"{self.config.BUSINESS} in {self.config.CITY}"
                search_box = page.locator('input#searchboxinput').or_(page.get_by_role("textbox", name="Search Google Maps")).or_(page.locator('input[name="q"]'))
                search_box.first.wait_for(state="visible", timeout=15000)
                search_box = search_box.first
                search_box.fill(search_query)
                page.keyboard.press("Enter")
                
                # Wait for results
                try:
                    page.wait_for_selector('a.hfpxzc', timeout=20000)
                except PlaywrightTimeoutError:
                    page.screenshot(path=os.path.join(self.config.DATA_DIR, "debug_no_results.png"))
                    raise
                
                # Scroll
                feed_selectors = ['div[role="feed"]', 'div[aria-label^="Results for"]', 'div.m6QErb.DxyBCb']
                results_selector = None
                for selector in feed_selectors:
                    if page.locator(selector).count() > 0:
                        results_selector = selector
                        break
                
                if results_selector:
                    self._human_scroll(page, results_selector)
                
                total_visible = page.locator('a.hfpxzc').count()
                seen_names = set()
                seen_urls = set()
                seen_domains = set()

                for i in range(total_visible):
                    if len(self.results) >= self.config.MAX_RESULTS:
                        break
                    try:
                        listing = page.locator('a.hfpxzc').nth(i)
                        listing.scroll_into_view_if_needed()
                        
                        maps_url = listing.get_attribute("href") or ""
                        listing_text = listing.inner_text()
                        is_sponsored = "Sponsored" in listing_text or "Ad\n" in listing_text or "Ad ·" in listing_text
                        
                        expected_name = "Unknown"
                        aria_label = listing.get_attribute("aria-label")
                        if aria_label:
                            expected_name = aria_label.split('·')[0].strip()
                        
                        if not expected_name or expected_name == "Unknown":
                            name_el = listing.locator('div.qBF1Pd').first
                            if name_el.count() > 0:
                                expected_name = name_el.inner_text().strip()

                        if not expected_name or expected_name == "Unknown":
                            if listing_text:
                                expected_name = listing_text.split('\n')[0].strip()
                        
                        # Click
                        clicked = False
                        for retry in range(3):
                            try:
                                current_listing = page.locator('a.hfpxzc').nth(i)
                                current_listing.click(timeout=5000)
                                clicked = True
                                break
                            except:
                                self._random_delay(1, 2)
                        
                        if not clicked:
                            continue
                        
                        # Sync panel
                        try:
                            if expected_name != "Unknown":
                                # Wait for panel to show the name
                                page.locator('h1.DUwDvf').filter(has_text=expected_name).wait_for(timeout=10000)
                                # Wait for URL to reflect the new place
                                page.wait_for_function("url => url.includes('/place/')", timeout=5000)
                                maps_url = page.url
                                self._random_delay(1, 1.5)
                            else:
                                self._random_delay(2, 3)
                        except:
                            self._random_delay(1, 2)
                        
                        panel_name_locator = page.locator('h1.DUwDvf')
                        name = panel_name_locator.first.inner_text().strip() if panel_name_locator.count() > 0 else "Unknown"
                        
                        is_match = (expected_name == "Unknown" or 
                                   expected_name.lower() in name.lower() or 
                                   name.lower() in expected_name.lower())
                        
                        if not is_match and expected_name != "Unknown":
                            continue
                        
                        if name == "Unknown" and expected_name != "Unknown":
                            name = expected_name
                        
                        if name == "Unknown":
                            continue
                        
                        url_id = maps_url.split('?')[0] if maps_url else ""
                        if name in seen_names or (url_id and url_id in seen_urls):
                            continue
                        
                        address_loc = page.locator('button[data-item-id="address"]')
                        address = address_loc.inner_text() if address_loc.count() > 0 else ""

                        phone_loc = page.locator('button[data-item-id^="phone:tel:"]')
                        phone = phone_loc.inner_text().replace('', '').strip() if phone_loc.count() > 0 else ""
                        
                        website_loc = page.locator('a[data-item-id="authority"]')
                        has_website = website_loc.count() > 0
                        website_url = website_loc.get_attribute("href") if has_website else None
                        
                        # Review count
                        review_count = ""
                        try:
                            rev_btn = page.locator('button[jsaction*="pane.rating.moreReviews"]').first
                            if rev_btn.count() > 0:
                                text = rev_btn.inner_text().strip()
                                review_count = text.replace('reviews', '').replace('review', '').replace('(', '').replace(')', '').strip()
                            if not review_count:
                                rev_span = page.locator('span[aria-label*="reviews"]').first
                                if rev_span.count() > 0:
                                    text = rev_span.get_attribute("aria-label") or ""
                                    text = text.lower().split('review')[0]
                                    review_count = text.replace('(', '').replace(')', '').strip()
                        except:
                            pass
                        
                        if has_website:
                            domain = _get_main_domain(website_url)
                            if domain in seen_domains:
                                continue
                        
                        biz_data = {
                            "name": name,
                            "address": address,
                            "phone": phone,
                            "website": website_url,
                            "has_website": has_website,
                            "maps_url": maps_url,
                            "city": self.config.CITY,
                            "business_type": self.config.BUSINESS,
                            "review_count": review_count
                        }
                        
                        self.results.append(biz_data)
                        
                        # Neat and clean data logging
                        print(f"\n[SUCCESS] Result {len(self.results)} extracted:")
                        print(f"  - Name:    {name}")
                        print(f"  - Website: {website_url if website_url else 'None'}")
                        print(f"  - Phone:   {phone if phone else 'None'}")
                        print(f"  - Reviews: {review_count if review_count else '0'}")
                        print(f"  - URL:     {maps_url[:60]}...")
                        print("-" * 30)
                        
                        seen_names.add(name)
                        if url_id:
                            seen_urls.add(url_id)
                        if has_website:
                            domain = _get_main_domain(website_url)
                            if domain:
                                seen_domains.add(domain)
                        
                    except Exception:
                        continue

            except PlaywrightTimeoutError:
                logger.error("Timeout waiting for map results.")
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
            finally:
                context.close()
                browser.close()

        return self.results
