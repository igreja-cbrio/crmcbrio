# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CBRio PMO is a Project Management Office web app for Igreja CBRio. It manages events, projects, strategic expansion milestones, and meetings — with AI agent integration via Anthropic API.

## Development Setup

### Prerequisites
1. PostgreSQL 14+ running locally
2. Create DB and user:
   ```bash
   psql -U postgres -c "CREATE USER cbrio WITH PASSWORD 'cbrio123';"
   psql -U postgres -c "CREATE DATABASE cbrio_pmo OWNER cbrio;"
   psql -U cbrio -d cbrio_pmo -f cbrio-pmo-schema.sql
   ```
3. Seed default users: `cd backend && npm run seed`

### Running the App
Run both servers concurrently (two terminals):
```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

### Build & Production
```bash
cd frontend && npm run build      # Outputs to frontend/dist/
cd backend && npm run start       # Production server
```

### Default Login Credentials (after seed)
- `diretor@cbrio.com.br` / `diretor` — full access
- `admin@cbrio.com.br` / `admin` — read access to projects/expansion
- `assistente@cbrio.com.br` / `123` — events only

## Architecture

### Request Flow
```
Browser (localhost:5173)
  → Vite dev proxy: /api/* → localhost:3001
  → Express middleware: JWT auth → RBAC check → route handler
  → PostgreSQL (pool via pg)
  → JSON response
```

### Backend (`backend/`)
- **`server.js`** — Express app entry: mounts all middleware (Helmet, HPP, CORS, rate limiting, morgan, compression) and registers route modules under `/api/`
- **`middleware/auth.js`** — JWT verification + RBAC enforcement. The `authorize(...roles)` middleware factory is used in routes
- **`utils/db.js`** — PostgreSQL connection pool. Exposes `query(text, params)` and `transaction(callback)` helpers
- **`utils/sanitize.js`** — `sanitizeObj()` for XSS escaping all incoming request bodies; `isValidUUID()` for param validation; `logAudit()` for DB audit trail
- **`routes/`** — 6 domain modules: `auth`, `events`, `projects`, `expansion`, `meetings`, `agents`

### Frontend (`frontend/src/`)
- **`App.jsx`** (~37KB) — Monolithic single-component SPA. All state is managed locally with `useState`. Modules (login, events, projects, expansion, meetings) are rendered conditionally within this file. No external state library.
- **`api.js`** — Thin fetch wrapper. Injects `Authorization: Bearer <token>` header automatically. Namespaced into `auth`, `events`, `projects`, `expansion`, `meetings`. Triggers logout on 401.

### Database
Schema defined in `cbrio-pmo-schema.sql`. 25 tables across 7 domains with 5 pre-built views for dashboard queries:
- `v_events_dashboard` — events with task/meeting counts
- `v_projects_dashboard` — projects with average progress %
- `v_expansion_dashboard` — milestones with cascaded progress
- `v_pendencies_by_area` — bottlenecks by ministry area
- `v_workload_by_responsible` — consolidated workload per person

### RBAC (3 Roles)
| Role | Events | Projects/Expansion | Create/Edit/Delete | AI Agents |
|------|--------|-------------------|-------------------|-----------|
| `assistente` | read | ❌ | ❌ | ❌ |
| `admin` | read | read | ❌ | ❌ |
| `diretor` | full | full | ✅ | ✅ |

### AI Agents (`routes/agents.js`)
Proxies requests to the Anthropic API. The API key (`ANTHROPIC_API_KEY`) is never exposed to the frontend — all calls go through `/api/agents`. Includes an approval queue and full interaction logging in the `agent_queue` / `agent_log` tables.

## Key Conventions

- **All SQL uses parameterized queries** (`$1, $2...`) — never string concatenation
- **All incoming data is sanitized** via `sanitizeObj()` before use
- **Route params assumed to be UUIDs** — validate with `isValidUUID()` before querying
- **Backend env vars** are in `backend/.env` (see README for required keys)
- No test framework is currently configured

## Missing Features Backlog

`FUNCIONALIDADES-FALTANTES.md` tracks known missing frontend features including: status filters on event list, calendar data sync, event templates, Gantt view, CSV import, email notifications, and PDF export.
