from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Dict
from app.core.db import get_session
from app.api.v1.endpoints.auth import get_current_user_role, oauth2_scheme
from app.models.favorite import Favorite, FavoriteToggleRequest
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub: str = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return sub
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.get("/", response_model=List[int])
async def get_my_favorites(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get a list of media IDs favorited by the current user.
    """
    statement = select(Favorite.media_id).where(Favorite.user_id == user_id)
    results = session.exec(statement).all()
    return results

@router.post("/toggle")
async def toggle_favorite(
    request: FavoriteToggleRequest,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Toggle the favorite state of a specific media item for the current user.
    """
    statement = select(Favorite).where(
        Favorite.user_id == user_id,
        Favorite.media_id == request.media_id
    )
    existing_fav = session.exec(statement).first()

    if existing_fav:
        session.delete(existing_fav)
        session.commit()
        return {"status": "removed", "media_id": request.media_id}
    else:
        new_fav = Favorite(user_id=user_id, media_id=request.media_id)
        session.add(new_fav)
        session.commit()
        return {"status": "added", "media_id": request.media_id}

@router.get("/stats", response_model=Dict[int, int])
async def get_favorites_stats(
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    """
    Get the total number of favorites for each media item. Admin only.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    statement = select(Favorite.media_id, func.count(Favorite.id)).group_by(Favorite.media_id)
    results = session.exec(statement).all()
    
    # results is a list of tuples (media_id, count)
    return {media_id: count for media_id, count in results}
