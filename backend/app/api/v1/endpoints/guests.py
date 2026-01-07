from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.guest import Guest, GuestCreate, GuestRead
from app.services.email import send_pin_email
from app.api.v1.endpoints.auth import get_current_user_role
import random
import string

router = APIRouter()

def generate_pin(length=8):
    return ''.join(random.choices(string.digits, k=length))

@router.post("/", response_model=GuestRead)
async def create_guest(
    guest_in: GuestCreate, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if email exists
    statement = select(Guest).where(Guest.email == guest_in.email)
    existing_guest = session.exec(statement).first()
    if existing_guest:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate PIN
    pin = generate_pin()
    
    # Create Guest object explicitly to include PIN
    guest = Guest(
        email=guest_in.email,
        name=guest_in.name,
        is_active=guest_in.is_active,
        pin=pin
    )
    
    session.add(guest)
    session.commit()
    session.refresh(guest)
    
    # Send Email
    background_tasks.add_task(send_pin_email, guest.email, pin, guest.name)
    
    return guest

@router.get("/", response_model=List[GuestRead])
def read_guests(
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    guests = session.exec(select(Guest)).all()
    return guests

@router.delete("/{guest_id}")
def delete_guest(
    guest_id: int,
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    guest = session.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
        
    session.delete(guest)
    session.commit()
    return {"ok": True}
