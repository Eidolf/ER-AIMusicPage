from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class MediaBase(SQLModel):
    filename: str
    url: str
    media_type: str = Field(index=True) # 'video' or 'audio'
    related_to_id: Optional[int] = Field(default=None, index=True)
    title: Optional[str] = Field(default=None)
    genre: Optional[str] = Field(default=None, index=True)

class Media(MediaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MediaCreate(MediaBase):
    pass

class MediaRead(MediaBase):
    id: int
    created_at: datetime
