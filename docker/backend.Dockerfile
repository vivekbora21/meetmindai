FROM python:3.10-slim

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend directory
COPY backend/ /app/backend/

ENV PYTHONPATH=/app/backend

EXPOSE 8000

CMD ["python", "run.py", "server"]
