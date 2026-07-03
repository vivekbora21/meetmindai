# MeetingMind AI

MeetingMind AI is a multi-tenant meeting intelligence platform for capturing meetings, joining live calls with a bot, transcribing conversations, extracting decisions and action items, and building a long-term organizational memory.

## Repository Layout

```text
.
├── backend/        # FastAPI service, REST endpoints, auth, meeting APIs
├── frontend/       # Next.js app router UI
├── workers/        # Celery tasks and AI processing pipeline
├── agent/          # Meeting bot connectors and streaming helpers
├── shared/         # SQLAlchemy models and database bootstrap
├── scripts/        # Local setup and database initialization scripts
└── docs/           # Architecture, deployment, and testing documentation
```

## Core Flow

1. A user creates or schedules a meeting in the UI.
2. The backend stores meeting metadata in PostgreSQL.
3. If a meeting link is provided, the scheduled meeting record is created and the bot join is queued.
4. Workers join the meeting, process audio, extract insights, and update meeting records.
5. The frontend fetches meeting details and renders summaries, insights, and meeting state.

## Local Development & Setup

For a complete step-by-step guide to installing and running this project from scratch on another system, refer to the [Installation & Setup Guide](INSTALL.md). It includes platform-specific instructions for:
- 🖥️ **Ubuntu (Linux)**
- 🏁 **Windows**

### Quick Entry Points:
- Backend: `backend/app/main.py`
- Frontend: `frontend/src/app/page.tsx`
- Celery tasks: `backend/app/celery_app.py`

