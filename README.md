# ER-AIMusicPage

![Project Logo](docs/images/logo.png)

A secure, modern, and high-performance platform for displaying and managing AI-generated music and videos.

## Features

*   **Glassmorphism UI**: Modern, dark, and neon-accented interface.
*   **Secure Access**: 8-digit PIN protection for all content.
*   **Media Management**: Upload, download, and view vertical videos.
*   **Production Ready**: Dockerized, CI/CD pipelines, and structured logging.

## Tech Stack

*   **Frontend**: React + Vite + TypeScript (Outfit Font, Glass Styles)
*   **Backend**: FastAPI + Pydantic + SQLModel
*   **Infrastructure**: Docker + GitHub Actions

## Quick Start

### Prerequisites
*   Docker & Docker Compose
*   Node.js 20+ (for local dev)
*   Python 3.11+ (for local dev)

### Run with Docker

```bash
docker-compose up --build
```

### Deploy with Portainer (Production)

You can easily deploy this stack using Portainer by using the pre-built images from GitHub Container Registry.

**Portainer Stack Configuration:**
```yaml
version: "3.8"
services:
  er-music:
    image: ghcr.io/eidolf/er-aimusicpage:latest
    container_name: er-music
    restart: unless-stopped
    ports:
      - 13030:13030
    volumes:
      - /path/to/your/data:/app/data
      - /path/to/your/music:/app/static/uploads
    environment:
      - TZ=Europe/Berlin
```
Just replace `/path/to/your/...` with your actual server paths.


Access the app at `http://localhost:13030`.
Default PIN: `12345678`

## Development

### Backend

```bash
cd backend
poetry install
uvicorn app.main:app --reload --port 13030
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

The project follows a Domain-Driven Design (DDD) approach with separation of concerns.

*   `backend/app/api`: API Endpoints
*   `backend/app/core`: Configuration & Security
*   `frontend/src/components`: React Components
*   `.github/workflows`: CI/CD Orchestration

## License
Private / Proprietary
