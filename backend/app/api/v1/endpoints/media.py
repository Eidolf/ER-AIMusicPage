from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from typing import List, Optional
import shutil
import os
from sqlmodel import Session, select, SQLModel
from app.core.db import get_session
from app.models.media import Media, MediaRead
from app.api.v1.endpoints.auth import get_current_user_role

router = APIRouter()

# Storage path
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=MediaRead)
async def upload_file(
    file: UploadFile = File(...),
    media_type: str = Form(...), # 'video' or 'audio'
    related_to_id: Optional[int] = Form(None),
    title: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Generate unique filename to avoid overwrite? For now simple.
    # sanitize filename
    safe_filename = file.filename.replace(" ", "_").replace("/", "")
    file_location = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_location, "wb+") as buffer:
        while content := await file.read(1024 * 1024): # 1MB chunks
            buffer.write(content)
    
    # URL relative to static mount
    url = f"/limit_static/uploads/{safe_filename}"
    
    db_media = Media(
        filename=safe_filename,
        url=url,
        media_type=media_type,
        related_to_id=related_to_id,
        title=title,
        genre=genre
    )
    
    session.add(db_media)
    session.commit()
    session.refresh(db_media)
    
    return db_media

@router.get("/videos", response_model=List[MediaRead])
async def get_videos(session: Session = Depends(get_session)):
    statement = select(Media).where(Media.media_type == "video").order_by(Media.created_at.desc())
    results = session.exec(statement).all()
    return results

@router.get("/audio", response_model=List[MediaRead])
async def get_audio(session: Session = Depends(get_session)):
    statement = select(Media).where(Media.media_type == "audio").order_by(Media.created_at.desc())
    results = session.exec(statement).all()
    return results

@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    media_item = session.get(Media, media_id)
    if not media_item:
        raise HTTPException(status_code=404, detail="Media not found")
        
    # Delete file from disk
    # The URL is like /limit_static/uploads/filename
    # We need to map it back to storage path "static/uploads/filename"
    try:
        filename = media_item.filename
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
        
    session.delete(media_item)
    session.commit()
    return {"ok": True}

class MediaUpdate(SQLModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    related_to_id: Optional[int] = None

@router.put("/{media_id}", response_model=MediaRead)
async def update_media(
    media_id: int,
    update_data: MediaUpdate,
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    media_item = session.get(Media, media_id)
    if not media_item:
        raise HTTPException(status_code=404, detail="Media not found")
        
    if update_data.title is not None:
        media_item.title = update_data.title
    if update_data.genre is not None:
        media_item.genre = update_data.genre
    if update_data.related_to_id is not None:
        # If -1 is passed, clear it? Or just allow null. 
        # For now assume explicit update.
        media_item.related_to_id = update_data.related_to_id
        
    session.add(media_item)
    session.commit()
    session.refresh(media_item)
    return media_item
