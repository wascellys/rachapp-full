# Fallback Root Dockerfile - Builds the Backend (rachas_api)
# This allows deployment without setting "Root Directory" in Railway for the backend service.

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements from the subdirectory
COPY rachas_api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend code from the subdirectory
COPY rachas_api/ .

# Create necessary directories
RUN mkdir -p staticfiles media

# Expose port
EXPOSE 8000

# Start command
CMD sh -c "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"
