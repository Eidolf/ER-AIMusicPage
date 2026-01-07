from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from typing import List, Optional
import shutil
import os
from sqlmodel import Session, select
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
