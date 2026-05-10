# PathIQ API (FastAPI + TensorFlow). Build from repository root:
#   docker build -t pathiq-api .
# Run:
#   docker run -p 8000:8000 -e PATHIQ_CORS_ORIGINS=https://your-app.vercel.app pathiq-api
#
# Model weights (.keras) are gitignored. Without them, /health and workflow routes work;
# /analyze returns 503 until you run scripts/bootstrap_minimal_demo.py inside the container
# or mount backend/model/artifacts from the host.

FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

COPY backend /app/backend
COPY scripts /app/scripts

RUN mkdir -p /app/data/feedback

ENV PYTHONUNBUFFERED=1
ENV PATHIQ_DB_PATH=/app/data/pathiq_workflow.db

EXPOSE 8000

CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
