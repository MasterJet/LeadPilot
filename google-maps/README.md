# Google Maps Lead Extraction Automation Tool

This tool extracts business information from Google Maps and identifies businesses without websites.

## Setup

### Development Mode (Local with uv)
1. Install and setup environment:
   ```bash
   # Create venv and install dependencies
   uv venv
   source .venv/bin/activate
   uv pip install -r requirements.txt
   uv run playwright install chromium
   ```
2. Configure `.env`:
   ```env
   CITY=Vienna
   BUSINESS=plumber
   HEADLESS=false
   MAX_RESULTS=20
   ENABLE_VIDEO=true
   ```
3. Run:
   ```bash
   uv run python main.py
   ```

### Production Mode (Docker)
1. Configure `.env` (ensure `HEADLESS=true`).
2. Run with Docker Compose:
   ```bash
   docker compose build
   # or
   docker compose run maps-scraper
   ```

## Output
- **Database**: `data/leads.db` (SQLite)
- **CSV Exports**: `data/exports/`
- **Session Videos**: `data/videos/`
