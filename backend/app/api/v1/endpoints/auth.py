from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlmodel import Session, select
from jose import jwt, JWTError
from app.core.config import settings
from app.core.db import get_session
from app.models.guest import Guest

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str # 'admin' or 'guest'

class PINLogin(BaseModel):
    pin: str

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

from app.models.settings import SystemSettings

@router.post("/login", response_model=Token)
def login_access_token(
    login_data: PINLogin,
    session: Session = Depends(get_session)
) -> Any:
    """
    Login with PIN (Master or Guest)
    """
    role = None
    sub = None

    # Fetch System Settings for dynamic Admin PIN
    sys_settings = session.exec(select(SystemSettings)).first()
    current_admin_pin = sys_settings.admin_pin if (sys_settings and sys_settings.admin_pin) else settings.ACCESS_PIN

    # Check Master PIN
    if login_data.pin == current_admin_pin:
        role = "admin"
        sub = "admin"
    else:
        # Check Guest DB
        statement = select(Guest).where(Guest.pin == login_data.pin)
        guest = session.exec(statement).first()
        if guest and guest.is_active:
            role = "guest"
            sub = str(guest.id)
    
    if not role:
        raise HTTPException(status_code=400, detail="Incorrect PIN")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            {"sub": sub, "role": role}, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "role": role
    }

def get_current_user_role(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        role: str = payload.get("role")
        if role is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return role
    except JWTError:
         raise HTTPException(status_code=401, detail="Could not validate credentials")

# Dependencies for routes
def verify_admin(role: str = Depends(get_current_user_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return role
