import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints import (
    auth,
    meetings,
    search,
    knowledge,
    analytics,
    agent_events,
    teams_bot,
    profile,
    ai,
    calendar,
)

app = FastAPI(
    title="MeetingMind AI API",
    description="Enterprise-grade Organizational Memory Platform API",
    version="1.0.0",
)

# Serve uploaded files static directory
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple rate limiter/latency logger middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Standard healthcheck endpoint
@app.get("/health")
def healthcheck():
    return {"status": "healthy", "timestamp": time.time()}


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(auth.microsoft_router, tags=["microsoft-auth"])
app.include_router(auth.google_router, tags=["google-auth"])
app.include_router(calendar.router, tags=["calendar"])

app.include_router(profile.router, prefix="/api/v1/profile", tags=["profile"])
app.include_router(meetings.router, prefix="/api/v1/meetings", tags=["meetings"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["knowledge"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(agent_events.router, prefix="/api/v1/agent", tags=["agent"])
app.include_router(teams_bot.router, prefix="/api/v1/agent/teams", tags=["teams-bot"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(ai.meeting_router, prefix="/api/meetings", tags=["meetings"])


@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.services.scheduler import start_scheduler
    asyncio.create_task(start_scheduler())


