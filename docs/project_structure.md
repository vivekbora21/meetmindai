# Recommended Project Structure

This document defines the preferred structure for MeetingMind AI so the codebase stays easy to debug, extend, and review.

## Goals

- Keep UI, API, worker, and bot logic separated.
- Make feature ownership obvious.
- Reduce cross-imports and hard-to-trace side effects.
- Keep production and local-development concerns visible.

## Recommended Tree

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   ├── core/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   └── package.json
├── workers/
│   ├── tasks.py
│   ├── pipelines/
│   └── requirements.txt
├── agent/
│   ├── connectors/
│   └── streaming/
├── shared/
│   ├── database.py
│   ├── models.py
│   └── constants.py
├── scripts/
├── docs/
└── tests/
```

## What Goes Where

- `backend/app/api`: request handlers and route definitions.
- `backend/app/services`: business logic that should stay reusable and testable.
- `backend/app/schemas`: request and response models.
- `frontend/src/app`: routes and pages.
- `frontend/src/components`: reusable UI components.
- `frontend/src/lib`: API clients, helpers, and utilities.
- `workers/pipelines`: long-running processing workflows.
- `agent/connectors`: platform-specific bot join logic.
- `shared`: code used by more than one runtime, especially models and database setup.

## Rules Of Thumb

- Put pure business logic in services, not route handlers.
- Keep database model definitions centralized.
- Avoid importing frontend-specific logic into backend or worker code.
- Prefer one-way dependencies:
  - `frontend` depends on API contracts.
  - `backend` depends on `shared`.
  - `workers` depend on `shared`.
  - `agent` depends on connector interfaces and `shared` only when required.

## Debugging Benefits

- Clear boundaries make stack traces easier to interpret.
- Shared models and schemas reduce drift between services.
- Worker pipelines can be traced independently from API requests.
- Route handlers stay thin, which makes failures easier to isolate.

## Next Cleanup Steps

1. Move API payload models out of endpoint files into `backend/app/schemas`.
2. Extract meeting business logic into `backend/app/services/meetings_service.py`.
3. Split worker flow into `workers/pipelines/meeting_ingestion.py`.
4. Add a shared API client in `frontend/src/lib/api.ts`.
5. Add `tests/` for auth, meetings, and worker tasks.

