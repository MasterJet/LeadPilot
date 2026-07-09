
# Google Maps Lead Extraction Automation Tool
## Full Technical Implementation Specification

---

# 1. Purpose

Build a reusable, Dockerized automation tool that extracts business information from Google Maps and identifies businesses that do not have a website.

The system must support both:

- Development mode (visible browser)
- Production mode (headless Docker execution)

The system must be designed for repeatable execution and integration into automation platforms.

---

# 2. Primary Objectives

The tool must:

1. Automate Google Maps searches
2. Extract business data
3. Detect missing websites
4. Store structured data
5. Export CSV files
6. Run in Docker
7. Support headless and headed modes
8. Be fully configurable
9. Be reusable without code modification

---

# 3. Technology Stack

## Required Technologies

- Python 3.11+
- Playwright (Python version)
- Chromium browser (via Playwright)
- SQLite database
- Docker
- Docker Compose

---

## Required Python Libraries

requirements.txt must include:

```

playwright
python-dotenv

```

Standard library modules used:

```

sqlite3
csv
os
argparse
datetime
time

```

---

# 4. Project Structure

The system must follow this exact structure:

```

maps-scraper/
│
├── main.py
├── config.py
│
├── scraper/
│   └── maps_scraper.py
│
├── storage/
│   ├── database.py
│   └── csv_exporter.py
│
├── data/
│   ├── leads.db
│   ├── exports/
│   └── videos/
│
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env
└── README.md

```

---

# 5. Configuration System

All configuration must be controlled via environment variables.

Example `.env` file:

```

CITY=Vienna
BUSINESS=plumber
HEADLESS=true
MAX_RESULTS=100
ENABLE_VIDEO=true

```

---

# 6. Development vs Production Strategy

This system must support two execution modes:

---

## 6.1 Development Mode

Purpose:
- Debugging
- Observing browser behavior

Execution method:

```

HEADLESS=false python main.py

```

Requirements:

- Browser window must be visible
- Video recording optional
- No Docker required

Expected behavior:

- Chromium browser opens visibly
- Developer observes automation
- Data saved locally

---

## 6.2 Production Mode

Purpose:
- Automated execution
- Server deployment
- Automation pipelines

Execution method:

```

docker compose run maps-scraper

```

Configuration:

```

HEADLESS=true

```

Requirements:

- Browser must run headless
- No GUI required
- Fully automated execution

---

## 6.3 Debug Mode in Docker (Video Recording)

When running in Docker, browser cannot be seen.

Instead, system must support video recording.

Configuration:

```

ENABLE_VIDEO=true

```

Videos must be saved to:

```

data/videos/

```

Video format:

```

.webm

```

---

# 7. Browser Automation Requirements

## 7.1 Playwright Initialization

The system must:

Initialize Playwright:

```

playwright = sync_playwright().start()

```

Launch Chromium:

```

browser = playwright.chromium.launch(
headless=HEADLESS
)

```

Create browser context:

If video enabled:

```

context = browser.new_context(
record_video_dir="data/videos/"
)

```

Else:

```

context = browser.new_context()

```

Create page:

```

page = context.new_page()

```

---

# 8. Navigation Workflow

The system must:

Navigate to:

```

[https://www.google.com/maps](https://www.google.com/maps)

```

Wait for page load.

---

# 9. Search Execution

Search query format:

```

{BUSINESS} in {CITY}

```

Example:

```

plumber in Vienna

```

System must:

- Find search input
- Enter query
- Press Enter
- Wait for results

---

# 10. Results Scrolling

Google Maps loads results dynamically.

The system must:

- Identify results container
- Scroll container repeatedly
- Continue until:

Either:

- MAX_RESULTS reached

OR

- No new results load

---

# 11. Business Extraction

For each business listing:

System must click listing.

Extract:

## Required Fields

Business Name  
Address  
Phone Number (optional)  
Website URL (optional)  
Google Maps URL  

---

# 12. Website Detection Logic

If website element exists:

```

has_website = true

```

If website element missing:

```

has_website = false
website = NULL

```

This field is critical.

---

# 13. Database Requirements

Database file:

```

data/leads.db

```

Database type:

SQLite

Table schema:

```

CREATE TABLE businesses (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
address TEXT,
phone TEXT,
website TEXT,
has_website BOOLEAN,
maps_url TEXT,
city TEXT,
business_type TEXT,
scraped_at TEXT
);

```

Insert each business record.

---

# 14. CSV Export Requirements

Export location:

```

data/exports/

```

Filename format:

```

{business}_{city}.csv

```

Example:

```

plumber_vienna.csv

```

CSV must include all fields.

---

# 15. Docker Requirements

Dockerfile must use Playwright official image:

```

FROM mcr.microsoft.com/playwright/python

```

Dockerfile must:

- Set working directory
- Copy project files
- Install requirements
- Run main.py

---

# 16. Docker Compose Requirements

docker-compose.yml must:

- Build container
- Mount data directory

Example volume:

```

./data:/app/data

```

This ensures persistence.

---

# 17. Execution Commands

Development mode:

```

pip install -r requirements.txt
playwright install
HEADLESS=false python main.py

```

Production mode:

```

docker compose build
docker compose run maps-scraper

```

---

# 18. Error Handling Requirements

System must handle:

- Missing elements
- Timeout errors
- Navigation errors
- Partial failures

System must continue processing remaining businesses.

System must not crash entirely due to single failure.

---

# 19. Logging Requirements

System must log:

System start  
Configuration loaded  
Search query  
Number of businesses processed  
Number missing websites  
Export completion  
System shutdown  

---

# 20. Shutdown Requirements

System must cleanly close:

```

page.close()
context.close()
browser.close()
playwright.stop()

```

---

# 21. Reusability Requirement

Changing city or business must NOT require code changes.

Only environment variable changes.

Example:

```

CITY=Graz
BUSINESS=dentist

```

---

# 22. Completion Criteria

System is complete when:

- Runs locally
- Runs in Docker
- Extracts business data
- Stores SQLite database
- Exports CSV
- Detects missing websites
- Supports headless mode
- Supports development mode
- Supports video recording in Docker

---

# 23. Future Compatibility

System must be compatible with:

- Scheduled execution
- Automation pipelines
- External orchestration tools
- Integration into larger automation systems

---

# END OF IMPLEMENTATION SPECIFICATION

