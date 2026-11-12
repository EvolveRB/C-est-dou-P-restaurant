# ---- Stage 1: Build the React frontend ------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Runtime image (FastAPI + static files) --------------------
FROM python:3.11-slim AS backend-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias de Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar backend y la carpeta de imágenes
COPY backend/ .

# Copiar el build del frontend desde la etapa 1
COPY --from=frontend-builder /app/frontend/dist ./frontend-dist

ENV STATIC_FRONTEND_PATH=/app/frontend-dist

# Puerto expuesto por defecto
EXPOSE 8000

# Railway inyecta la variable $PORT automáticamente al iniciar
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

