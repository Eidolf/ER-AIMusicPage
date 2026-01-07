from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class GuestBase(SQLModel):
    email: str = Field(index=True)
    name: Optional[str] = None
    is_active: bool = True

class Guest(GuestBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pin: str = Field(index=True) # The generated 8-digit PIN
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GuestCreate(GuestBase):
    pass

class GuestRead(GuestBase):
    id: int
    created_at: datetime
    # Do not return PIN in list view for security, only visible on creation via email or one-time show? 
    # Actually, user might want to see it to re-send manually. Let's include it for Admin.
    pin: str 
