from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import structlog
import os
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.api.v1.endpoints import auth, media, guests
from app.api.v1.endpoints import settings as settings_endpoint
from app.core.db import init_db

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(media.router, prefix="/api/v1/media", tags=["media"])
app.include_router(guests.router, prefix="/api/v1/guests", tags=["guests"])
app.include_router(settings_endpoint.router, prefix="/api/v1/settings", tags=["settings"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/ready")
async def readiness_check():
    return {"status": "ready"}

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(static_dir, exist_ok=True)
if os.path.exists(static_dir):
    app.mount("/limit_static", StaticFiles(directory=static_dir), name="static")

# Catch-all for SPA
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("limit_static"):
         return {"detail": "Not Found"}
    
    possible_path = os.path.join(static_dir, full_path)
    if os.path.exists(possible_path) and os.path.isfile(possible_path):
        return FileResponse(possible_path)

    return FileResponse(os.path.join(static_dir, "index.html"))
