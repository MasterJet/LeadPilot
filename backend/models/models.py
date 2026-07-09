from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    campaigns = relationship("Campaign", back_populates="user")
    llm_keys = relationship("LLMKey", back_populates="user")


class LLMKey(Base):
    __tablename__ = "llm_keys"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50))
    api_key = Column(String(255))
    name = Column(String(100))
    is_valid = Column(Boolean, default=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="llm_keys")
    campaigns = relationship("Campaign", back_populates="llm_key")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    niche = Column(String(100))
    location = Column(String(100))
    status = Column(String(50), default="active")
    user_id = Column(Integer, ForeignKey("users.id"))
    llm_key_id = Column(Integer, ForeignKey("llm_keys.id"), nullable=True)
    prompt_instructions = Column(Text, nullable=True)

    # Unified AI / Auto-Pilot fields
    is_ai_driven = Column(Boolean, default=False)
    ai_prompt = Column(Text, nullable=True)
    target_leads = Column(Integer, default=20)
    searched_locations = Column(Text, default="[]")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Per-Campaign Scoring Strategy
    weight_has_website = Column(Integer, default=2)
    weight_no_website = Column(Integer, default=0)
    weight_has_whatsapp = Column(Integer, default=3)
    weight_no_chatbot = Column(Integer, default=5)
    weight_has_booking = Column(Integer, default=5)
    weight_no_response_mechanism = Column(Integer, default=4)

    user = relationship("User", back_populates="campaigns")
    llm_key = relationship("LLMKey", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    niche = Column(String(100), index=True)
    location = Column(String(100), index=True)
    website = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    rating = Column(Float, nullable=True)
    reviews_count = Column(Integer, default=0)
    google_maps_url = Column(String(512), nullable=True)
    score = Column(Integer, default=0)
    priority = Column(String(20), default="low")
    status = Column(String(50), default="new")

    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # ── Flat filterable intelligence columns ───────────────────────────────
    has_whatsapp = Column(Boolean, default=False)
    has_chatbot = Column(Boolean, default=False)
    has_booking_system = Column(Boolean, default=False)
    has_facebook = Column(Boolean, default=False)
    has_instagram = Column(Boolean, default=False)
    cms_name = Column(String(100), nullable=True)  # e.g. "WordPress 6.4", "Shopify"

    # ── Full intelligence report ───────────────────────────────────────────
    analysis_json = Column(Text, nullable=True)  # Serialized JSON dict

    campaign = relationship("Campaign", back_populates="leads")
    messages = relationship("Message", back_populates="lead")
    activities = relationship("Activity", back_populates="lead")

    @property
    def analysis(self):
        import json
        if not self.analysis_json:
            return None
        try:
            parsed = json.loads(self.analysis_json)
            social = parsed.get("social_presence", {})
            conversion = parsed.get("conversion", {})
            
            # Map legacy properties to maintain absolute backward compatibility
            if "whatsapp_link" not in parsed:
                parsed["whatsapp_link"] = social.get("whatsapp_url")
            if "instagram_link" not in parsed:
                parsed["instagram_link"] = social.get("instagram_url")
            if "facebook_link" not in parsed:
                parsed["facebook_link"] = social.get("facebook_url")
            if "linkedin_link" not in parsed:
                parsed["linkedin_link"] = social.get("linkedin_url")
            if "email_address" not in parsed:
                parsed["email_address"] = self.email
            if "contact_form_link" not in parsed:
                # If contact_form_link is not explicit, use contact_form_link if available or check conversion
                parsed["contact_form_link"] = conversion.get("contact_form_link")
            if "has_whatsapp" not in parsed:
                parsed["has_whatsapp"] = self.has_whatsapp
            if "has_chatbot" not in parsed:
                parsed["has_chatbot"] = self.has_chatbot
                
            return parsed
        except Exception:
            return None


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    message_text = Column(Text)
    channel = Column(String(50))
    type = Column(String(50))
    status = Column(String(50), default="draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="messages")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    action = Column(String(100))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="activities")
