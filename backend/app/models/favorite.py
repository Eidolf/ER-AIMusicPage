from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class FavoriteBase(SQLModel):
    user_id: str = Field(index=True) # "admin" or stringified guest ID
    media_id: int = Field(index=True)

class Favorite(FavoriteBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FavoriteToggleRequest(SQLModel):
    media_id: int

class FavoriteRead(FavoriteBase):
    id: int
    created_at: datetime
