from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.settings import SystemSettings
from app.api.v1.endpoints.auth import get_current_user_role

router = APIRouter()

@router.get("/", response_model=SystemSettings)
def get_settings(
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Singleton pattern: Get first or create default
    settings = session.exec(select(SystemSettings)).first()
    if not settings:
        settings = SystemSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    
    return settings

@router.post("/", response_model=SystemSettings)
def update_settings(
    settings_in: SystemSettings,
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = session.exec(select(SystemSettings)).first()
    if not settings:
        settings = SystemSettings()
        session.add(settings)
    
    # Update fields
    settings.smtp_host = settings_in.smtp_host
    settings.smtp_port = settings_in.smtp_port
    settings.smtp_user = settings_in.smtp_user
    settings.smtp_password = settings_in.smtp_password
    settings.smtp_tls = settings_in.smtp_tls
    settings.sender_email = settings_in.sender_email
    settings.sender_name = settings_in.sender_name
    
    # Only update PIN if provided (not empty)
    if settings_in.admin_pin:
        settings.admin_pin = settings_in.admin_pin
        
    settings.domain = settings_in.domain
    
    session.add(settings)
    session.commit()
    session.refresh(settings)
    
    return settings
