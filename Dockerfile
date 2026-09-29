# Build Frontend
FROM node:20-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Final Stage
FROM python:3.11-slim
WORKDIR /app

# Setup virtual environment and install runtime dependencies
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN python -m venv $VIRTUAL_ENV && pip install --upgrade pip poetry

COPY backend/pyproject.toml backend/poetry.lock* /app/
RUN mkdir -p data && chmod 777 data
RUN poetry install --no-interaction --no-ansi --no-root --only main

# Copy Frontend Build
COPY --from=frontend-build /app/frontend/dist /app/static

# Copy Backend Code
COPY backend/app /app/app

# Environment
ENV PYTHONPATH=/app
ENV PORT=13030

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "13030"]
