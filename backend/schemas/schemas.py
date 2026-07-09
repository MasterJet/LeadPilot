from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class LeadBase(BaseModel):
    name: str
    niche: str
    location: str
    website: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = 0
    google_maps_url: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    score: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class LeadResponse(LeadBase):
    id: int
    score: int
    priority: str
    status: str
    email: Optional[str] = None
    has_whatsapp: bool = False
    has_chatbot: bool = False
    has_booking_system: bool = False
    has_facebook: bool = False
    has_instagram: bool = False
    cms_name: Optional[str] = None
    analysis_json: Optional[str] = None   # raw JSON string
    analysis: Optional[Any] = None        # parsed JSON dictionary/object
    analyzed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScoringConfigBase(BaseModel):
    name: Optional[str] = None
    weight_has_website: int = 2
    weight_no_website: int = 0
    weight_has_whatsapp: int = 3
    weight_no_chatbot: int = 5
    weight_has_booking: int = 5
    weight_no_response_mechanism: int = 4


class ScoringConfigCreate(ScoringConfigBase):
    pass


class ScoringConfigResponse(ScoringConfigBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class LLMKeyBase(BaseModel):
    provider: str
    api_key: str
    name: str


class LLMKeyCreate(LLMKeyBase):
    pass


class LLMKeyResponse(BaseModel):
    id: int
    provider: str
    name: str
    is_valid: bool
    created_at: datetime

    class Config:
        from_attributes = True
