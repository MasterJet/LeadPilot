# LeadPilot: Project State & Completed Features

LeadPilot is a semi-automated outbound sales engine designed to scrape, qualify, and engage leads from Google Maps. This document summarizes all implemented features as of May 2026.

## 1. Technical Architecture
- **Frontend**: Next.js (App Router) with Tailwind CSS and Framer Motion for premium UI/UX.
- **Backend**: FastAPI (Python) for the REST API.
- **Task Queue**: Celery with Redis for asynchronous lead scraping and website analysis.
- **Database**: MySQL 8.0 for persistent storage of leads, campaigns, and analysis results.
- **Browser Automation**: Playwright (Headless/Headed) for robust Google Maps scraping and website crawling.
- **AI Integration**: Custom provider-agnostic system supporting OpenAI (GPT-4o) and Google Gemini (1.5 Flash/Pro) via official SDKs.

## 2. Campaign Management
- **Mission Creation**: Users can define "Campaign Missions" targeting specific niches (e.g., "Cosmetic Clinics") and locations (e.g., "London").
- **Dynamic Scoring Weights**: Configurable weights for lead scoring (e.g., higher score if no website, or no booking system).
- **LLM Configuration**: Ability to add multiple LLM keys (OpenAI/Gemini) and assign them to specific campaigns.
- **Custom AI Instructions**: Campaign-specific prompts that dictate the tone and content of generated outreach messages.

## 3. Lead Scraping Engine (High Reliability)
- **Iterative Scrolling**: Smart scrolling logic that continues until the requested lead count is met, even if duplicates are encountered.
- **Duplicate Management**: Exhaustive tracking of business names and URLs to ensure 100% unique leads per campaign.
- **Stale Detection**: Aggressive detection of the end of search results to prevent infinite loops.
- **Debug Tools**: Built-in Playwright video recording (`/app/recordings/`) for auditing scraper behavior.

## 4. Enrichment & Analysis
- **Website Crawling**: Automatically visits lead websites to detect:
  - Email addresses and phone numbers.
  - Social media links (WhatsApp, Instagram, Facebook).
  - Presence of booking systems or chatbots.
- **Lead Scoring**: Calculates a priority score (High/Medium/Low) based on the campaign's weight configuration.

## 5. Leads Management Dashboard
- **Advanced Filtering**: Filter leads by:
  - **Campaign**: View leads for a specific mission.
  - **Status**: New, Analyzed, Contacted, Replied, etc.
  - **Search**: Real-time search by name or website URL.
- **Data Export**: One-click **Download CSV** feature that exports the currently filtered data with all enrichment details (social links, analysis, etc.).
- **Quick Links**: Direct icons for Website and Google Maps access from the lead list.

## 6. Outreach Dashboard
- **AI Outreach Generator**: 
  - Generates personalized messages using lead-specific data (name, niche, location, website gaps).
  - Respects **Campaign Custom Instructions** and uses the assigned **LLM Key**.
  - Supports **Regeneration** to iterate on message content.
- **Multi-Channel Contact**:
  - Direct links to WhatsApp, Instagram, Facebook, and Email.
  - **Smart Tooltips**: Hover over icons to see phone numbers, handles, or emails without clicking.
- **Status Tracking**: Ability to mark leads as "Contacted" or "Not Interested" directly from the dashboard.

## 7. Reliability & Stability Fixes
- **Async Event Loop Management**: Correct implementation of `asyncio.run()` in Celery workers to prevent task corruption.
- **Robust Scraper Selectors**: Hardened Playwright selectors for Google Maps to handle UI changes.
- **Error Handling**: Comprehensive logging for scraping, AI generation (handling 404s/429s), and database operations.

---
**Current Status**: The core "Scrape -> Analyze -> Outreach" loop is fully functional and optimized for production-grade reliability.
