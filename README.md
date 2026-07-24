# MeetingMind AI

MeetingMind AI is a multi-tenant meeting intelligence platform for capturing meetings, transcribing conversations, extracting decisions, action items, risks, and building a long-term organizational memory using a knowledge graph.

## Repository Layout

```text
.
├── backend/
│   ├── app/        # FastAPI application (main, api endpoints, models, Celery tasks, etc.)
│   ├── alembic/    # Database migrations (Alembic)
│   └── scripts/    # Database initialization and setup scripts
├── frontend/       # Next.js app router frontend UI
├── nginx/          # Nginx configurations
├── INSTALL.md      # Installation & Setup Guide
└── README.md       # Project overview
```

## Core Flow

1. A user creates/schedules a meeting in the UI, integrates with calendars, or uploads an audio/video recording.
2. The backend stores meeting metadata in PostgreSQL.
3. Once the media file is available, the Celery pipeline is triggered.
4. Celery workers extract the audio, transcribe it using Whisper, run speaker diarization, generate semantic embeddings, extract AI insights (summaries, action items, decisions, risks) using Gemini/OpenRouter, and build a knowledge graph.
5. The frontend fetches the processed meeting details and renders the transcripts, summaries, insights, knowledge graph, and meeting state.

## Local Development & Setup

For a complete step-by-step guide to installing and running this project from scratch on another system, refer to the [Installation & Setup Guide](INSTALL.md). It includes platform-specific instructions for:
- 🖥️ **Ubuntu (Linux)**
- 🏁 **Windows**

### Quick Entry Points:
- Backend Server: [main.py](file:///home/ubuntu/Desktop/ai/backend/app/main.py)
- Frontend UI: [page.tsx](file:///home/ubuntu/Desktop/ai/frontend/src/app/page.tsx)
- Celery App: [celery_app.py](file:///home/ubuntu/Desktop/ai/backend/app/celery_app.py)
- Celery Tasks: [meeting_tasks.py](file:///home/ubuntu/Desktop/ai/backend/app/tasks/meeting_tasks.py)


