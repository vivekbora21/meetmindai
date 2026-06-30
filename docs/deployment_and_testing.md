# MeetingMind AI - Deployment, Testing, and Security Guide

This document details the production deployment guide, CI/CD workflows, testing strategies, and safety audits for **MeetingMind AI**.

---

## 1. Production Deployment Guide

We recommend deployment via **Kubernetes** to achieve auto-scaling and high availability.

### 1.1. Kubernetes Architecture (Helm Structure)

In production, the application is deployed into the following structure:
* **meetingmind-api**: Horizontal Pod Autoscaling (HPA) targets 60% CPU usage.
* **meetingmind-workers**: Scaled independently depending on Celery queue depth.
* **Database (PostgreSQL)**: Multi-AZ RDS instance running PostgreSQL 15+ with pgvector extension enabled.
* **Redis**: Managed AWS ElastiCache for cache storage and Celery broker.
* **Storage**: Amazon S3 bucket with Lifecycle rules moving recordings to Glacier after 90 days.

### 1.2. CI/CD GitHub Actions Workflow Schema

```yaml
name: Deploy MeetingMind AI Platform
on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Run Pytest
        run: |
          pip install -r backend/requirements.txt
          pytest tests/
          
  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker Images
        run: |
          docker build -t gcr.io/meetingmind/backend:latest -f docker/backend.Dockerfile .
          docker build -t gcr.io/meetingmind/worker:latest -f docker/worker.Dockerfile .
      - name: Push to Registry
        run: |
          docker push gcr.io/meetingmind/backend:latest
          docker push gcr.io/meetingmind/worker:latest
```

---

## 2. Security Checklist

* [x] **Tenancy Isolation**: SQL query injection filters verify `organization_id` match.
* [ ] **Data Encryption**: Encrypt all audio files at rest in S3 using KMS keys.
* [ ] **SSL / TLS**: Force HTTPS on all endpoints using Nginx ingress controller.
* [ ] **Rate Limiting**: Enable slowapi/FastAPI middleware limiting to 100 requests per minute per IP.
* [ ] **PII Masking**: Cleanse names, emails, and credit card numbers from transcripts before sending context to OpenAI/Gemini APIs.

---

## 3. Scalability & Future Feature Roadmap

1. **Active Speaker Diarization Tweaks**: Optimize Pyannote pipelines using GPU-accelerated workers.
2. **Knowledge Graph Visual Scaling**: Upgrade visual canvas layout engine using D3.js force-directed links.
3. **Calendar Integrations**: Auto-sync meetings via Google Calendar API & Microsoft Graph API.
4. **Slack/Teams App notifications**: Send interactive blocks detailing decisions directly to team channels.
