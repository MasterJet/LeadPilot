import asyncio
import re
import json
import time
import logging
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.IGNORECASE
)
EMAIL_BLACKLIST = {
    # Blacklisted domains/hosts
    "sentry.io", "example.com", "domain.com", "youremail.com",
    "wixpress.com", "squarespace.com", "shopify.com", "wordpress.com",
    
    # Asset / non-email extensions that could match EMAIL_REGEX (e.g. image@2x.png)
    "png", "jpg", "jpeg", "gif", "svg", "webp", "pdf", "zip", "css", "js", "ico",
    "woff", "woff2", "ttf", "eot", "mp4", "mp3", "mov", "avi", "xlsx", "docx", "pptx",
}
CONTACT_PATHS = [
    "/contact", "/contact-us", "/contact_us", "/contactus",
    "/about", "/about-us", "/reach-us", "/get-in-touch", "/support",
]


def _clean_emails(text: str) -> list:
    found = EMAIL_REGEX.findall(text)
    seen, clean = set(), []
    for e in found:
        e = e.strip(".,;:\"'")
        domain = e.split("@")[-1].lower()
        if domain in EMAIL_BLACKLIST:
            continue
        
        # Check if domain ends with a blacklisted extension/TLD (e.g., .jpg, .png, etc.)
        domain_parts = domain.split(".")
        if len(domain_parts) > 1 and domain_parts[-1] in EMAIL_BLACKLIST:
            continue
            
        if e.lower() not in seen:
            seen.add(e.lower())
            clean.append(e)
    return clean


class WebsiteAnalyzer:
    def __init__(self, headless: bool = True):
        self.headless = headless

    async def analyze(self, url: str) -> dict:
        """
        Returns a flat dict of filterable fields + a nested analysis_json dict.
        """
        result = {
            # Flat filterable fields
            "email": None,
            "has_whatsapp": False,
            "has_chatbot": False,
            "has_booking_system": False,
            "has_facebook": False,
            "has_instagram": False,
            "cms_name": None,
            # Full intelligence report
            "analysis_json": {
                "social_presence": {},
                "tech_stack": {},
                "seo": {},
                "security": {},
                "performance": {},
                "conversion": {},
            },
        }

        async with async_playwright() as p:
            browser = None
            try:
                browser = await p.chromium.launch(headless=self.headless)
                context = await browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0 Safari/537.36"
                    )
                )
                page = await context.new_page()

                # ── Load homepage ─────────────────────────────────────────────
                t0 = time.monotonic()
                await page.goto(url, timeout=45000, wait_until="domcontentloaded")
                await asyncio.sleep(2)
                load_ms = int((time.monotonic() - t0) * 1000)

                html = await page.content()
                html_lower = html.lower()

                # ── Links & mailto email ──────────────────────────────────────
                links = await self._extract_links(page)
                email = links.get("email")
                if email:
                    cleaned_emails = _clean_emails(email)
                    email = cleaned_emails[0] if cleaned_emails else None
                if not email:
                    emails = _clean_emails(html)
                    email = emails[0] if emails else None
                if not email:
                    email = await self._probe_contact_pages(page, url, links.get("contact"))
                result["email"] = email

                # ── Social Presence ───────────────────────────────────────────
                social = {
                    "instagram_url": links.get("ig"),
                    "facebook_url": links.get("fb"),
                    "linkedin_url": links.get("li"),
                    "whatsapp_url": links.get("wa"),
                    "twitter_url": links.get("tw"),
                    "youtube_url": links.get("yt"),
                }
                result["has_instagram"] = bool(social["instagram_url"] or "instagram.com" in html_lower)
                result["has_facebook"] = bool(social["facebook_url"] or "facebook.com" in html_lower)
                result["has_whatsapp"] = bool(social["whatsapp_url"] or "wa.me" in html_lower or "whatsapp" in html_lower)
                result["analysis_json"]["social_presence"] = social

                # ── Tech Stack ────────────────────────────────────────────────
                tech = await self._detect_tech_stack(page, html, html_lower)
                result["cms_name"] = tech.get("cms")
                result["analysis_json"]["tech_stack"] = tech

                # ── SEO ───────────────────────────────────────────────────────
                seo = await self._analyze_seo(page, html_lower, url)
                result["analysis_json"]["seo"] = seo

                # ── Security ──────────────────────────────────────────────────
                security = await self._analyze_security(page, url)
                result["analysis_json"]["security"] = security

                # ── Performance ───────────────────────────────────────────────
                perf = await self._analyze_performance(page, html, html_lower, load_ms)
                result["analysis_json"]["performance"] = perf

                # ── Conversion ────────────────────────────────────────────────
                conv = await self._analyze_conversion(page, html_lower, links)
                result["has_chatbot"] = conv.get("has_chatbot", False)
                result["has_booking_system"] = conv.get("has_booking_system", False)
                result["analysis_json"]["conversion"] = conv

            except Exception as e:
                logger.error(f"WebsiteAnalyzer.analyze({url}) failed: {e}")
            finally:
                if browser:
                    await browser.close()

        return result

    # ─────────────────────────────────────────────────────────────────────────
    # Link extractor
    # ─────────────────────────────────────────────────────────────────────────

    async def _extract_links(self, page) -> dict:
        return await page.evaluate("""() => {
            const links = Array.from(document.querySelectorAll('a'));
            let ig=null,fb=null,wa=null,contact=null,email=null,li=null,tw=null,yt=null;
            const host = window.location.hostname.replace('www.','');
            for (let a of links) {
                if (!a.href) continue;
                const href = a.href.toLowerCase();
                if (!ig && href.includes('instagram.com/')) ig = a.href;
                if (!fb && href.includes('facebook.com/')) fb = a.href;
                if (!li && href.includes('linkedin.com/')) li = a.href;
                if (!wa && (href.includes('wa.me/') || href.includes('api.whatsapp.com/'))) wa = a.href;
                if (!tw && href.includes('twitter.com/')) tw = a.href;
                if (!yt && href.includes('youtube.com/')) yt = a.href;
                if (!email && href.startsWith('mailto:')) {
                    const addr = a.href.replace('mailto:','').split('?')[0].trim();
                    if (addr.includes('@')) email = addr;
                }
                try {
                    const u = new URL(a.href);
                    const isInternal = u.hostname.replace('www.','') === host;
                    const path = u.pathname.toLowerCase();
                    if (!contact && isInternal &&
                        (path.includes('contact')||path.includes('book')||path.includes('about')||path.includes('reach'))) {
                        contact = a.href;
                    }
                } catch(e){}
            }
            return {ig,fb,wa,contact,email,li,tw,yt};
        }""")

    async def _probe_contact_pages(self, page, base_url: str, detected: str | None) -> str | None:
        parsed = urlparse(base_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        candidates = ([detected] if detected else []) + [urljoin(origin, p) for p in CONTACT_PATHS]
        visited = set()
        for url in candidates:
            if url in visited:
                continue
            visited.add(url)
            try:
                resp = await page.goto(url, timeout=18000, wait_until="domcontentloaded")
                if not resp or resp.status >= 400:
                    continue
                await asyncio.sleep(1)
                lnks = await self._extract_links(page)
                if lnks.get("email"):
                    cleaned_emails = _clean_emails(lnks["email"])
                    if cleaned_emails:
                        return cleaned_emails[0]
                emails = _clean_emails(await page.content())
                if emails:
                    return emails[0]
            except Exception:
                continue
        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Tech Stack Detection
    # ─────────────────────────────────────────────────────────────────────────

    async def _detect_tech_stack(self, page, html: str, html_lower: str) -> dict:
        tech = {
            "cms": None,
            "cms_version": None,
            "frameworks": [],
            "analytics": [],
            "ecommerce": [],
            "plugins": [],
            "server": None,
            "cdn": None,
        }

        # CMS detection
        # Attempt to find generator meta tag for version extraction
        generator_match = re.search(r'<meta[^>]+name=["\']generator["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        generator_content = generator_match.group(1) if generator_match else ""

        if "wp-content" in html_lower or "wp-includes" in html_lower:
            tech["cms"] = "WordPress"
            m = re.search(r'WordPress\s*([\d.]+)', generator_content, re.IGNORECASE)
            if m:
                tech["cms_version"] = m.group(1)
        elif "shopify" in html_lower or "cdn.shopify.com" in html_lower:
            tech["cms"] = "Shopify"
        elif "squarespace" in html_lower:
            tech["cms"] = "Squarespace"
        elif "wixsite" in html_lower or "wix.com" in html_lower:
            tech["cms"] = "Wix"
        elif "webflow" in html_lower:
            tech["cms"] = "Webflow"
        elif "ghost" in html_lower and "ghost.io" in html_lower:
            tech["cms"] = "Ghost"
            m = re.search(r'Ghost\s*([\d.]+)', generator_content, re.IGNORECASE)
            if m:
                tech["cms_version"] = m.group(1)
        elif "drupal" in html_lower:
            tech["cms"] = "Drupal"
            m = re.search(r'Drupal\s*([\d.]+)', generator_content, re.IGNORECASE)
            if m:
                tech["cms_version"] = m.group(1)
        elif "joomla" in html_lower:
            tech["cms"] = "Joomla"
            m = re.search(r'Joomla!\s*([\d.]+)', generator_content, re.IGNORECASE)
            if m:
                tech["cms_version"] = m.group(1)

        # Frontend frameworks
        if "react" in html_lower or "__next" in html_lower or "_next/static" in html_lower:
            tech["frameworks"].append("React / Next.js")
        if "vue" in html_lower or "nuxtjs" in html_lower:
            tech["frameworks"].append("Vue.js")
        if "angular" in html_lower:
            tech["frameworks"].append("Angular")
        m = re.search(r'jquery[/-]([\d.]+)', html_lower)
        if m:
            tech["frameworks"].append(f"jQuery {m.group(1)}")

        # Analytics
        if "gtag" in html_lower or "google-analytics" in html_lower or "googletagmanager" in html_lower:
            tech["analytics"].append("Google Analytics / GTM")
        if "fbq(" in html_lower or "connect.facebook.net" in html_lower:
            tech["analytics"].append("Facebook Pixel")
        if "hotjar" in html_lower:
            tech["analytics"].append("Hotjar")
        if "hubspot" in html_lower:
            tech["analytics"].append("HubSpot")

        # E-commerce
        if "woocommerce" in html_lower:
            tech["ecommerce"].append("WooCommerce")
        if "cdn.shopify.com" in html_lower:
            tech["ecommerce"].append("Shopify Storefront")
        if "stripe" in html_lower:
            tech["ecommerce"].append("Stripe")
        if "paypal" in html_lower:
            tech["ecommerce"].append("PayPal")

        # Server / CDN from response headers
        try:
            headers = await page.evaluate("""async () => {
                try {
                    const r = await fetch(window.location.href, {method:'HEAD'});
                    const h = {};
                    r.headers.forEach((v,k)=>{ h[k.toLowerCase()]=v; });
                    return h;
                } catch(e){ return {}; }
            }""")
            tech["server"] = headers.get("server")
            if headers.get("cf-ray") or headers.get("cf-cache-status"):
                tech["cdn"] = "Cloudflare"
            elif headers.get("x-amz-cf-id"):
                tech["cdn"] = "AWS CloudFront"
            elif headers.get("x-vercel-id"):
                tech["cdn"] = "Vercel"
        except Exception:
            pass

        return tech

    # ─────────────────────────────────────────────────────────────────────────
    # SEO Analysis
    # ─────────────────────────────────────────────────────────────────────────

    async def _analyze_seo(self, page, html_lower: str, url: str) -> dict:
        seo = await page.evaluate("""() => {
            const getMeta = (name) => {
                const m = document.querySelector(`meta[name='${name}'], meta[property='${name}']`);
                return m ? m.getAttribute('content') : null;
            };
            const title = document.title || null;
            const description = getMeta('description') || getMeta('og:description');
            const h1s = Array.from(document.querySelectorAll('h1')).map(h=>h.innerText.trim());
            const imgs = Array.from(document.querySelectorAll('img'));
            const missingAlt = imgs.filter(i=>!i.alt||i.alt.trim()==='').length;
            const canonical = document.querySelector('link[rel=canonical]');
            const ogTitle = getMeta('og:title');
            const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
            return {
                title,
                title_length: title ? title.length : 0,
                description,
                description_length: description ? description.length : 0,
                h1_count: h1s.length,
                h1_text: h1s[0] || null,
                total_images: imgs.length,
                images_missing_alt: missingAlt,
                has_canonical: !!canonical,
                canonical_url: canonical ? canonical.href : null,
                has_og_tags: !!ogTitle,
                has_schema_markup: schemaScripts.length > 0,
                schema_count: schemaScripts.length,
            };
        }""")

        issues = []
        if not seo["title"]: issues.append("Missing page title")
        elif seo["title_length"] < 30: issues.append("Title too short (<30 chars)")
        elif seo["title_length"] > 65: issues.append("Title too long (>65 chars)")
        if not seo["description"]: issues.append("Missing meta description")
        elif seo["description_length"] > 165: issues.append("Meta description too long (>165 chars)")
        if seo["h1_count"] == 0: issues.append("No H1 tag found")
        elif seo["h1_count"] > 1: issues.append(f"Multiple H1 tags ({seo['h1_count']})")
        if seo["images_missing_alt"] > 0:
            issues.append(f"{seo['images_missing_alt']} images missing alt text")
        if not seo["has_canonical"]: issues.append("No canonical tag")
        if not seo["has_og_tags"]: issues.append("No Open Graph tags")
        if not seo["has_schema_markup"]: issues.append("No Schema.org / JSON-LD markup")

        # Check sitemap & robots
        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        seo["has_sitemap"] = await self._url_exists(page, f"{origin}/sitemap.xml")
        seo["has_robots_txt"] = await self._url_exists(page, f"{origin}/robots.txt")
        if not seo["has_sitemap"]: issues.append("No sitemap.xml found")
        if not seo["has_robots_txt"]: issues.append("No robots.txt found")

        # Score: 100 minus 10 per issue (min 0)
        seo["score"] = max(0, 100 - len(issues) * 10)
        seo["issues"] = issues
        return seo

    # ─────────────────────────────────────────────────────────────────────────
    # Security Analysis
    # ─────────────────────────────────────────────────────────────────────────

    async def _analyze_security(self, page, url: str) -> dict:
        parsed = urlparse(url)
        has_ssl = parsed.scheme == "https"

        # Check HTTP→HTTPS redirect
        https_redirect = False
        if has_ssl:
            http_url = url.replace("https://", "http://", 1)
            try:
                resp = await page.goto(http_url, timeout=10000, wait_until="domcontentloaded")
                if resp:
                    https_redirect = resp.url.startswith("https://")
            except Exception:
                pass
            # Restore to original page
            try:
                await page.goto(url, timeout=20000, wait_until="domcontentloaded")
            except Exception:
                pass

        # Security headers
        security_headers = await page.evaluate("""async () => {
            try {
                const r = await fetch(window.location.href, {method:'HEAD'});
                const h = {};
                r.headers.forEach((v,k)=>{ h[k.toLowerCase()]=v; });
                return {
                    hsts: h['strict-transport-security'] || null,
                    csp: h['content-security-policy'] || null,
                    x_frame: h['x-frame-options'] || null,
                    x_content_type: h['x-content-type-options'] || null,
                };
            } catch(e){ return {}; }
        }""")

        issues = []
        if not has_ssl: issues.append("No SSL certificate (HTTP only)")
        if has_ssl and not https_redirect: issues.append("HTTP does not redirect to HTTPS")
        if not security_headers.get("hsts"): issues.append("Missing HSTS header")
        if not security_headers.get("csp"): issues.append("Missing Content-Security-Policy")
        if not security_headers.get("x_frame"): issues.append("Missing X-Frame-Options")

        return {
            "has_ssl": has_ssl,
            "https_redirect": https_redirect,
            "headers": security_headers,
            "issues": issues,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Performance Analysis
    # ─────────────────────────────────────────────────────────────────────────

    async def _analyze_performance(self, page, html: str, html_lower: str, load_ms: int) -> dict:
        perf = await page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const lazyImgs = imgs.filter(i=>i.getAttribute('loading')==='lazy').length;
            const hasMobileViewport = !!document.querySelector('meta[name="viewport"]');
            const headScripts = document.querySelectorAll('head > script:not([defer]):not([async])').length;
            const totalScripts = document.querySelectorAll('script').length;
            const totalStylesheets = document.querySelectorAll('link[rel=stylesheet]').length;
            return {
                total_images: imgs.length,
                lazy_images: lazyImgs,
                has_mobile_viewport: hasMobileViewport,
                render_blocking_scripts: headScripts,
                total_scripts: totalScripts,
                total_stylesheets: totalStylesheets,
            };
        }""")

        perf["page_load_ms"] = load_ms
        perf["page_size_kb"] = round(len(html.encode("utf-8")) / 1024, 1)

        issues = []
        if load_ms > 5000: issues.append(f"Slow load time: {load_ms}ms (>5s)")
        elif load_ms > 3000: issues.append(f"Moderate load time: {load_ms}ms (>3s)")
        if not perf["has_mobile_viewport"]: issues.append("Not mobile-friendly (missing viewport meta)")
        if perf["total_images"] > 0 and perf["lazy_images"] == 0:
            issues.append("No lazy loading on images")
        if perf["render_blocking_scripts"] > 2:
            issues.append(f"{perf['render_blocking_scripts']} render-blocking scripts in <head>")
        if perf["page_size_kb"] > 2000:
            issues.append(f"Large page size: {perf['page_size_kb']}KB (>2MB)")

        perf["issues"] = issues
        return perf

    # ─────────────────────────────────────────────────────────────────────────
    # Conversion Analysis
    # ─────────────────────────────────────────────────────────────────────────

    async def _analyze_conversion(self, page, html_lower: str, links: dict) -> dict:
        has_chatbot = any(kw in html_lower for kw in
                          ["intercom", "crisp.chat", "zendesk", "drift", "tidio", "chatbot", "livechat"])
        has_booking = any(kw in html_lower for kw in
                          ["calendly", "acuity", "booking", "appointment", "schedule", "book-online"])
        has_live_chat = any(kw in html_lower for kw in ["live chat", "livechat", "chat with us"])

        form_data = await page.evaluate("""() => {
            const forms = document.querySelectorAll('form');
            const hasCTA = !!document.querySelector(
                'a.btn, a.button, button.cta, .cta-button, [class*="cta"], [class*="book-now"]'
            );
            return { form_count: forms.length, has_cta: hasCTA };
        }""")

        return {
            "has_chatbot": has_chatbot,
            "has_booking_system": has_booking,
            "has_live_chat": has_live_chat,
            "has_contact_form": form_data["form_count"] > 0 or bool(links.get("contact")),
            "contact_form_count": form_data["form_count"],
            "has_cta_button": form_data["has_cta"],
            "has_whatsapp_widget": bool(links.get("wa")),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Utility
    # ─────────────────────────────────────────────────────────────────────────

    async def _url_exists(self, page, url: str) -> bool:
        try:
            resp = await page.goto(url, timeout=8000, wait_until="domcontentloaded")
            return resp is not None and resp.status < 400
        except Exception:
            return False
