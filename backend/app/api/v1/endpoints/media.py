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

@router.post("/scan")
async def scan_storage(
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    """
    Scans the storage directory for files that are not in the database and adds them.
    Only accessible by admins.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    added_count = 0
    try:
        # Get all filenames currently in DB
        statement = select(Media.filename)
        existing_filenames = set(session.exec(statement).all())
        
        # Iterate over files in storage
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                if filename in existing_filenames:
                    continue
                
                # Simple type detection
                lower_name = filename.lower()
                media_type = None
                if lower_name.endswith(('.mp4', '.webm', '.mov', '.avi', '.mkv')):
                    media_type = 'video'
                elif lower_name.endswith(('.mp3', '.wav', '.ogg', '.m4a')):
                    media_type = 'audio'
                
                if media_type:
                    # Add to DB
                    safe_filename = filename # Already on disk, assume safe or use as is
                    url = f"/limit_static/uploads/{safe_filename}"
                    
                    new_media = Media(
                        filename=safe_filename,
                        url=url,
                        media_type=media_type,
                        title=safe_filename, # Default title
                        genre="Recovered" # Default genre
                    )
                    session.add(new_media)
                    added_count += 1
            
            if added_count > 0:
                session.commit()
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning storage: {str(e)}")
        
    return {"message": f"Scan complete. Added {added_count} new files.", "added_count": added_count}


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
    # Check for duplicates
    existing = session.exec(select(Media).where(Media.filename == safe_filename)).first()
    if existing:
        raise HTTPException(status_code=400, detail="File with this name already exists")

    file_location = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_location, "wb+") as buffer:
        while content := await file.read(1024 * 1024): # 1MB chunks
            buffer.write(content)
    
    # URL relative to static mount
    url = f"/limit_static/uploads/{safe_filename}"

    # Genre inheritance logic
    final_genre = genre
    if related_to_id:
        parent_video = session.get(Media, related_to_id)
        if parent_video and parent_video.genre:
             final_genre = parent_video.genre
    
    db_media = Media(
        filename=safe_filename,
        url=url,
        media_type=media_type,
        related_to_id=related_to_id,
        title=title,
        genre=final_genre
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

@router.post("/reindex-audio")
async def reindex_audio(
    session: Session = Depends(get_session),
    role: str = Depends(get_current_user_role)
):
    """
    Syncs the genre of audio files with their parent video.
    Only accessible by admins.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Find all audios that are linked to a video
    statement = select(Media).where(Media.media_type == "audio", Media.related_to_id != None)
    audios = session.exec(statement).all()
    
    updated_count = 0
    for audio in audios:
        if audio.related_to_id:
            parent = session.get(Media, audio.related_to_id)
            if parent and parent.genre and parent.genre != audio.genre:
                audio.genre = parent.genre
                session.add(audio)
                updated_count += 1
    
    if updated_count > 0:
        session.commit()
        
    return {"message": f"Updated {updated_count} audio tracks with parent genres.", "updated_count": updated_count}

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
