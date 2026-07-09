from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models import models
from schemas import schemas
from core.auth import get_current_user
import urllib.request
import urllib.error
import openai

router = APIRouter()

def verify_openai_key(api_key: str) -> bool:
    try:
        client = openai.OpenAI(api_key=api_key)
        client.models.list()
        return True
    except Exception:
        return False

def verify_gemini_key(api_key: str) -> bool:
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            return response.status == 200
    except Exception:
        return False

@router.post("/", response_model=schemas.LLMKeyResponse)
def add_llm_key(key_data: schemas.LLMKeyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Verify Key
    is_valid = False
    if key_data.provider.lower() == "openai":
        is_valid = verify_openai_key(key_data.api_key)
    elif key_data.provider.lower() == "gemini":
        is_valid = verify_gemini_key(key_data.api_key)
    else:
        raise HTTPException(status_code=400, detail="Invalid provider. Use 'openai' or 'gemini'")
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or dead API key")

    # 2. Save Key
    new_key = models.LLMKey(
        provider=key_data.provider.lower(),
        api_key=key_data.api_key,
        name=key_data.name,
        is_valid=True,
        user_id=current_user.id
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return new_key

@router.get("/", response_model=list[schemas.LLMKeyResponse])
def get_llm_keys(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.LLMKey).filter(models.LLMKey.user_id == current_user.id).all()

@router.delete("/{key_id}")
def delete_llm_key(key_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    key = db.query(models.LLMKey).filter(models.LLMKey.id == key_id, models.LLMKey.user_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    # Check if key is in use by a campaign
    in_use = db.query(models.Campaign).filter(models.Campaign.llm_key_id == key_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete key as it is currently assigned to a campaign.")

    db.delete(key)
    db.commit()
    return {"message": "Key deleted successfully"}
