
---

# 📄 Project Brief: AI Outbound Lead Generation SaaS

## 1. Overview

Build a SaaS platform that helps niche businesses (starting with **cosmetic/aesthetic clinics**) generate leads and convert them into bookings using:

* Lead scraping (Google Maps data)
* Lead qualification & enrichment
* AI-generated personalized outreach
* Multi-channel communication (manual-first)
* Follow-up tracking

The system should function as a **semi-automated outbound sales engine**.

---

## 2. Core Objective

Convert:

> raw scraped business data

Into:

> structured, scored leads + personalized outreach + tracked conversations

---

## 3. Target Users

* Agency owners
* Freelancers
* Sales teams targeting local businesses

Initial niche:

* Cosmetic clinics
* Dental clinics
* Aesthetic centers

---

## 4. System Architecture

### Backend

* Framework: FastAPI
* Queue: Redis
* Workers: Celery or RQ
* Scraping: Playwright (preferred) or Selenium

### Frontend

* Next.js dashboard

### Database

* MySQL

### AI Layer

* OpenAI API (or compatible LLM)

---

## 5. Core Modules

---

## Module 1: Lead Ingestion Engine

### Input:

* Niche (string)
* Location (string)

### Process:

* Scrape Google Maps data
* Extract:

  * Business name
  * Address
  * Website
  * Phone
  * Google rating
  * Reviews count

### Output:

Store in `leads` table

---

## Module 2: Lead Enrichment & Analysis

### For each lead:

Visit website and extract:

* Has chatbot (boolean)
* Has WhatsApp (boolean)
* Has contact form (boolean)
* Has booking system (boolean)
* Page load success (boolean)

### Optional:

* Detect Instagram link
* Detect email

### Output:

Store in `lead_analysis` table

---

## Module 3: Lead Scoring System

### Scoring rules (example):

* Has website → +2
* Has WhatsApp → +3
* No chatbot → +5
* Has booking system but no automation → +5
* No response mechanism → +4

### Output:

* Final score (integer)
* Priority label (high / medium / low)

Stored in `leads.score`

---

## Module 4: AI Message Generator

### Input:

* Business name
* Niche
* Lead analysis data

### Output:

* Personalized outreach message (1–3 lines)

### Prompt behavior:

* Mention a real observation
* Highlight missed opportunity
* Offer demo

Example output:

> “Hi, I noticed your clinic website doesn’t respond instantly to inquiries. We built a system that replies immediately and books appointments automatically. Want a quick demo?”

Store in `messages` table

---

## Module 5: Outreach Manager (Manual First)

### Features:

* Display leads list
* Show:

  * score
  * analysis
  * suggested message

### Actions:

* Mark as:

  * contacted
  * replied
  * follow-up needed
  * closed

### Channels (manual execution):

* WhatsApp
* Instagram
* Email
* Contact form

(No full automation in MVP)

---

## Module 6: Follow-up System

### Logic:

* If no reply after X days:

  * Suggest follow-up message

### Example:

> “Just checking if you saw my message. Happy to show a quick demo tailored to your clinic.”

Track:

* follow-up count
* last contact date

---

## Module 7: Campaign Management

### Entity:

Campaign = niche + location + user

### Features:

* Create campaign
* Attach leads
* Track:

  * total leads
  * contacted
  * replied
  * converted

---

## Module 8: Dashboard

### Show metrics:

* Total leads
* Contacted leads
* Replies
* Conversion rate

### Basic UI:

* Table view of leads
* Filters:

  * score
  * status
  * niche
  * location

---

## 6. Database Schema (Simplified)

### leads

* id
* name
* niche
* location
* website
* phone
* rating
* reviews_count
* score
* status (new/contacted/replied/closed)
* created_at

---

### lead_analysis

* id
* lead_id
* has_chatbot
* has_whatsapp
* has_booking
* has_contact_form
* notes (text)

---

### messages

* id
* lead_id
* message_text
* channel (whatsapp/instagram/email)
* type (initial/followup)
* status (draft/sent)

---

### campaigns

* id
* name
* niche
* location
* user_id

---

### activities

* id
* lead_id
* action (contacted/replied/followup/closed)
* timestamp

---

## 7. Worker Architecture

### Worker 1: Scraper

* Input: niche + location
* Output: leads

### Worker 2: Analyzer

* Input: lead
* Output: lead_analysis

### Worker 3: Scorer

* Input: lead + analysis
* Output: score update

### Worker 4: Message Generator

* Input: lead + analysis
* Output: message

---

## 8. API Endpoints (Core)

### Leads

* GET /leads
* POST /leads/scrape
* GET /leads/{id}

### Analysis

* POST /leads/{id}/analyze

### Messages

* POST /messages/generate
* GET /messages/{lead_id}

### Campaigns

* POST /campaigns
* GET /campaigns/{id}

### Activities

* POST /activities/update

---

## 9. MVP Constraints

* No full automation of sending messages
* No third-party integrations initially
* Focus on:

  * lead quality
  * message quality
  * tracking

---

## 10. Success Criteria

System is successful if:

* User can generate 100+ leads
* System produces personalized messages
* User can track outreach
* At least 5–10% reply rate achieved

---

## 11. Future Enhancements (Post-MVP)

* WhatsApp API integration
* Instagram automation
* Auto demo video generation
* CRM integration
* Multi-user accounts
* Subscription billing

---

## Final Note (Important)

This is NOT just a tool.

The system must prioritize:

> clarity, speed, and conversion

Over:

> complexity, features, and automation

---


