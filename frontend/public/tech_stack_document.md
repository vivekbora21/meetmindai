# Tech Stack Document
## Employee–Project–Technology Intelligence Chatbot

**Version:** 1.0
**Last updated:** July 2026

---

## 1. Overview

This document outlines the technology stack chosen for a system that stores company employee, project, and technology data in a relational database, and exposes it through a natural-language chatbot (e.g. "who has worked with TypeScript?"). It also includes an AI-assisted layer that parses project repositories/manifests and generates structured + AI-summarized knowledge about each project.

The stack is split into six layers: **Frontend**, **Backend**, **Database**, **AI / Parsing**, **Background Processing**, and **Auth & Infrastructure**. Each choice below includes the reasoning behind it, not just the name of the tool.

---

## 2. Frontend

| Technology | Purpose | Why chosen |
|---|---|---|
| **Next.js (App Router) + TypeScript** | Core frontend framework | Server components render employee/project data without shipping unnecessary client JS. File-based routing and API proxying simplify structuring dashboard, chat, and admin views. |
| **Tailwind CSS** | Styling | Enables fast iteration on a polished, light-themed, modern UI without hand-rolled CSS — fits the visual bar expected for the product. |
| **shadcn/ui** | UI component primitives | Components are copied into the codebase rather than installed as an opaque dependency, so they can be restyled to match brand colors/typography instead of fighting a heavy pre-styled library. |
| **Vercel AI SDK (`ai` package)** | Chat streaming UI | Purpose-built for token-by-token streaming chat interfaces — handles message state, loading indicators, and stream parsing so the chat UI doesn't need to be built from scratch. |

---

## 3. Backend

| Technology | Purpose | Why chosen |
|---|---|---|
| **FastAPI** | Core backend framework | Async-native, so slow, I/O-bound calls (LLM API requests) don't block the event loop. Auto-generates OpenAPI documentation from route signatures. Gives direct access to Python's AI/ML ecosystem instead of calling out to it from another language. |
| **Pydantic v2** | Data validation & schemas | Doubles as both API request/response schema *and* validation for LLM tool-call parameters — the same model validates a REST payload and a function-call argument returned by the LLM. Reduces duplicate validation logic. |
| **SQLAlchemy 2.0 (async) + Alembic** | ORM & migrations | Idiomatic async Python ORM with fine-grained query control; Alembic manages versioned schema migrations. *(Alternative: Prisma Client Python, if reusing the exact schema/migration workflow from the DBML/SQL design is preferred over rewriting in SQLAlchemy.)* |
| **Uvicorn + Gunicorn** | ASGI server | Standard production serving setup for FastAPI — Gunicorn manages multiple Uvicorn workers across CPU cores for concurrency. |

---

## 4. Database

| Technology | Purpose | Why chosen |
|---|---|---|
| **PostgreSQL** | Primary data store | Relational integrity for employees/projects/technologies with foreign keys and constraints. Also does real application-level work: `pg_trgm` for fuzzy technology-name matching, `jsonb` + GIN indexes for AI-generated project knowledge snapshots, and future-proofs for `pgvector` if semantic search is added later. |
| **Redis** *(optional, add when needed)* | Caching & queue backing | Caches frequent chatbot queries (e.g. repeated "who knows React" lookups) and backs the background job queue. Not required for v1 — added once repeat query patterns are observed. |

**Core tables:** `departments`, `employees`, `projects`, `technologies`, `employee_projects` (junction), `project_technologies` (junction), `employee_skills` (junction — the table the chatbot's core query hits), `project_knowledge` (AI-generated cache/snapshot per project).

---

## 5. AI / Parsing Layer

This layer covers two distinct jobs with different reliability requirements, and the stack reflects that split.

### 5.1 Chat intent parsing (user question → structured query)

| Technology | Purpose | Why chosen |
|---|---|---|
| **Claude / GPT via function-calling (tool-use) API** | Converts natural language ("who worked in TypeScript") into a structured tool call (`findEmployeesByTechnology(technology="TypeScript")`) | This step needs to be accurate per-message since it's the core product promise — a hosted frontier model is worth the API cost here. Tool-calling constrains the LLM to a fixed set of parameterized functions, avoiding raw text-to-SQL risks (hallucinated columns, injection surface). |
| **`anthropic` / `openai` Python SDKs** | API clients | First-party, native async support, integrates directly with FastAPI's `StreamingResponse` for token-by-token output. |

### 5.2 Project knowledge generation (repo/docs → `project_knowledge` row)

| Technology | Purpose | Why chosen |
|---|---|---|
| **Static parsing first** (`tomllib`, `json`, regex on `package.json`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`) | Extracts hard facts about a project's stack | Dependency manifests are ground truth — parsing them directly is cheaper, faster, and more accurate than asking an LLM to guess a tech stack. The LLM is reserved for fields that genuinely need language understanding (`ai_summary`, `architecture`). |
| **`tree-sitter` (Python bindings)** *(optional)* | AST-level source parsing | Goes beyond manifest files to detect actual technology usage in code (e.g. confirms `express` is imported and used, not just listed as a dependency). |
| **Self-hosted Ollama** *(optional)* | Local LLM for summary generation | Lower reliability bar than intent-routing, so a local open-source model is acceptable here and avoids per-request API cost for a task that runs in the background. |

---

## 6. Background Processing

| Technology | Purpose | Why chosen |
|---|---|---|
| **Celery + Redis**, or **ARQ** | Async job queue | Repo scanning and LLM summarization are slow (seconds to minutes) — these run as background jobs rather than blocking the request/response cycle. ARQ is asyncio-native and integrates more naturally with FastAPI's async style; Celery is the more battle-tested, widely-documented default if broader ecosystem support matters more. |

---

## 7. Auth & Infrastructure

| Technology | Purpose | Why chosen |
|---|---|---|
| **`fastapi-users`**, or manual JWT (`python-jose` + `passlib`) | Authentication & authorization | `fastapi-users` provides registration/login/JWT/role-based routes out of the box; manual JWT gives tighter control over access rules specific to sensitive employee data. |
| **Docker Compose** | Local development environment | Runs Postgres, Redis, and the backend together as a single reproducible environment. |
| **Swagger / OpenAPI** (built into FastAPI) | API documentation | Auto-generated from route and Pydantic model definitions — no separate documentation step needed. |

---

## 8. Cross-cutting note: type safety across the stack split

Since the backend (Python/FastAPI) and frontend (TypeScript/Next.js) are different languages, Pydantic models and TypeScript types must be kept in sync deliberately. Two options:

1. **Generate a TypeScript client from FastAPI's OpenAPI spec** (e.g. `openapi-typescript`) — recommended, keeps types automatically in sync.
2. **Manual duplication** — acceptable for a small surface area, but drifts over time without discipline.

---

## 9. Deliberately excluded from v1

| Excluded | Reason |
|---|---|
| **pgvector / embeddings** | Not needed for exact-match queries like "who worked in TypeScript." Add only if semantic queries (e.g. "who discussed microservices in meetings") are introduced later. |
| **Dedicated vector database** (Pinecone, Weaviate) | Same reasoning — an added service and cost with no current use case. |
| **GraphQL** | Query patterns are narrow and tool-defined (a fixed set of chatbot functions); REST via FastAPI routers is simpler to reason about and secure. |

---

## 10. Summary table

| Layer | Primary technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui, Vercel AI SDK |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2.0 (async) / Alembic |
| Database | PostgreSQL (+ pg_trgm, jsonb/GIN), Redis (optional) |
| AI — chat intent | Claude / GPT function-calling |
| AI — project parsing | Static manifest parsing, tree-sitter (optional), Ollama (optional) |
| Background jobs | Celery or ARQ + Redis |
| Auth | fastapi-users or manual JWT |
| Infra | Docker Compose, OpenAPI/Swagger |
