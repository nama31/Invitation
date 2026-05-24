# EventInvite — AI Build Plan

> **How to use this file:**
> Each phase contains a `🤖 AI Prompt` block — copy it verbatim into your AI coding assistant (Cursor, Claude, Copilot, etc.). Complete each phase fully and verify it works before moving to the next. Phase 0 must be done first and only once.

---

## Phase 0 — Full Project Architecture (One Shot)

> **Goal:** Generate the entire project skeleton — folder structure, config files, Docker setup, DB models, and a deploy-ready base — in a single prompt. No business logic yet, just the foundation that every other phase builds on.

---

### 🤖 AI Prompt — Phase 0

```
You are a senior full-stack engineer. Scaffold a complete, production-ready project called "EventInvite" from scratch. Do not write any business logic yet — only the architecture, configuration, and skeleton files.

## Stack
- Backend: Python, FastAPI, SQLAlchemy (async), Asyncpg, Alembic, Pydantic v2, python-jose (JWT)
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- Database: PostgreSQL 16
- Infra: Docker, Docker Compose

## What to generate

### 1. Root project structure
Create this exact folder layout:
EventInvite/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── public.py        # empty router, prefix /api
│   │   │   └── admin.py         # empty router, prefix /api/admin
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py        # Pydantic Settings from .env
│   │   │   ├── database.py      # async engine + session factory
│   │   │   └── auth.py          # JWT create/verify stubs
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py          # declarative Base
│   │   │   ├── guest.py         # Guest model
│   │   │   ├── table.py         # Table model
│   │   │   └── rsvp.py          # RsvpResponse model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── guest.py         # GuestRead, GuestCreate, GuestUpdate
│   │   │   ├── rsvp.py          # RsvpPayload schema
│   │   │   └── table.py         # TableRead, TableCreate
│   │   └── main.py              # FastAPI app, include routers, CORS
│   ├── alembic/
│   │   ├── versions/            # empty dir
│   │   └── env.py               # async-ready Alembic env
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # empty guest home page
│   │   └── admin/
│   │       ├── layout.tsx       # admin layout wrapper
│   │       └── page.tsx         # empty admin dashboard page
│   ├── components/
│   │   └── .gitkeep
│   ├── lib/
│   │   └── api.ts               # base fetch wrapper pointing to NEXT_PUBLIC_API_URL
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example                 # root-level env combining all services
├── Makefile                     # shortcuts: make up, make migrate, make seed
└── README.md

### 2. Database models (SQLAlchemy async)
Define these exactly:

Table (tables):
  id: int PK autoincrement
  table_name: str not null
  max_seats: int not null

Guest (guests):
  id: int PK autoincrement
  first_name: str not null
  last_name: str not null
  status: Enum('pending','confirmed','declined') default 'pending'
  table_id: int FK → tables.id nullable

RsvpResponse (rsvp_responses):
  id: int PK autoincrement
  guest_id: int FK → guests.id unique not null
  dietary_preferences: str nullable
  alcohol_preference: str nullable
  needs_transport: bool default false

### 3. Alembic setup
- Configure env.py to use the async engine from app/core/database.py
- Add target_metadata = Base.metadata
- Generate the first migration: alembic revision --autogenerate -m "initial"

### 4. FastAPI main.py
- Create the FastAPI app with title "EventInvite API"
- Add CORSMiddleware allowing all origins in dev
- Include public router with prefix /api and admin router with prefix /api/admin
- Add a GET /health endpoint returning {"status": "ok"}

### 5. Pydantic Settings (core/config.py)
Load from .env:
  DATABASE_URL, JWT_SECRET, JWT_EXPIRE_MINUTES=60
  EVENT_NAME, EVENT_DATE (ISO string)
  ADMIN_EMAIL, ADMIN_PASSWORD (for seeding)

### 6. docker-compose.yml (development)
Services:
  postgres: image postgres:16, port 5432, volume for persistence
  backend: build ./backend, port 8000, depends_on postgres, mounts ./backend as volume for hot reload, runs: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  frontend: build ./frontend, port 3000, mounts ./frontend, runs: npm run dev

### 7. docker-compose.prod.yml (production overrides)
  backend: no volume mount, runs without --reload
  frontend: runs npm run build && npm start
  Add caddy or nginx service as reverse proxy on port 80/443 with auto HTTPS

### 8. Makefile
Shortcuts:
  make up        → docker-compose up -d --build
  make down      → docker-compose down
  make migrate   → docker-compose exec backend alembic upgrade head
  make seed      → docker-compose exec backend python -m app.seed
  make logs      → docker-compose logs -f
  make prod-up   → docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

### 9. .env.example files
Root .env.example:
  POSTGRES_USER=eventinvite
  POSTGRES_PASSWORD=secret
  POSTGRES_DB=eventinvite
  DATABASE_URL=postgresql+asyncpg://eventinvite:secret@postgres:5432/eventinvite
  JWT_SECRET=change_me_in_production
  JWT_EXPIRE_MINUTES=60
  EVENT_NAME=Our Event
  EVENT_DATE=2025-09-14T18:00:00
  ADMIN_EMAIL=admin@event.com
  ADMIN_PASSWORD=change_me
  NEXT_PUBLIC_API_URL=http://localhost:8000

### 10. requirements.txt
fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg, alembic, pydantic-settings, pydantic[email], python-jose[cryptography], passlib[bcrypt], python-multipart

### Output rules
- Write every file in full, no placeholders like "# add logic here" except in the empty router files.
- All Python files must be importable with no errors.
- After generating, list the exact commands to run the project for the first time:
  1. cp .env.example .env  (and fill in values)
  2. make up
  3. make migrate
  4. Open http://localhost:8000/health → should return {"status":"ok"}
  5. Open http://localhost:3000 → should show the Next.js default
```

---

## Phase 1 — Backend: Public API

> **Goal:** Build all guest-facing API endpoints. Guests can search for themselves and submit their RSVP + survey answers. No auth required.

---

### 🤖 AI Prompt — Phase 1

```
The project skeleton from Phase 0 is in place. Now implement the public-facing backend API in backend/app/api/public.py.

## Endpoints to implement

### GET /api/event
Returns the static event info from settings.
Response:
{
  "name": "Our Event",
  "date": "2025-09-14T18:00:00",
  "venue": "TBD"           ← add VENUE to settings too
}

### GET /api/guests/search?query=
- Query param: query (min 2 chars, else return empty list)
- Search first_name + last_name with ILIKE %query%
- Return max 10 results
- Response: list of { id, first_name, last_name, status }
- If a guest is already 'confirmed' or 'declined', still return them (so they can update)

### PATCH /api/guests/{id}/rsvp
Request body (RsvpPayload):
{
  "status": "confirmed" | "declined",
  "dietary_preferences": "vegetarian",   ← optional, only if confirmed
  "alcohol_preference": "wine",          ← optional
  "needs_transport": true                ← optional, default false
}
Logic:
  1. Fetch guest by id, raise 404 if not found
  2. Update guest.status
  3. If status == 'confirmed':
       Upsert RsvpResponse (create if not exists, update if exists)
  4. If status == 'declined':
       Delete RsvpResponse if it exists (guest won't attend, no need for survey data)
  5. Return updated guest: { id, first_name, last_name, status }

## Requirements
- Use async SQLAlchemy session (get_db dependency)
- All DB queries must be async (await session.execute(...))
- Validate inputs with Pydantic schemas (update schemas/rsvp.py and schemas/guest.py as needed)
- Return proper HTTP status codes: 200, 404, 422
- Add docstrings to each endpoint
```

---

## Phase 2 — Backend: Admin API + Auth

> **Goal:** Build the protected admin API. All routes require a valid JWT. Includes login, guest CRUD, table CRUD, seating assignment, and stats.

---

### 🤖 AI Prompt — Phase 2

```
Phase 1 public API is complete. Now implement the admin API in backend/app/api/admin.py and the auth logic in backend/app/core/auth.py.

## Auth (core/auth.py)
- POST /auth/login
  Body: { email, password }
  Logic: Compare against ADMIN_EMAIL and ADMIN_PASSWORD from settings (no DB user table needed)
  On success: return { access_token, token_type: "bearer" }
  On failure: raise 401 "Invalid credentials"

- JWT token payload: { sub: email, exp: now + JWT_EXPIRE_MINUTES }
- Create a reusable FastAPI dependency: get_current_admin(token: str = Depends(oauth2_scheme)) → verifies JWT, raises 401 if invalid/expired

## Admin endpoints (all require get_current_admin dependency)

### Stats
GET /api/admin/stats
Returns:
{
  "total": 120,
  "confirmed": 80,
  "declined": 15,
  "pending": 25,
  "tables_count": 10
}

### Guests
GET    /api/admin/guests              → list all guests with table info (join tables)
POST   /api/admin/guests              → create guest: { first_name, last_name }  status defaults to 'pending'
PUT    /api/admin/guests/{id}         → update first_name, last_name, status
DELETE /api/admin/guests/{id}         → delete guest (also deletes their rsvp_response via cascade)
PATCH  /api/admin/guests/{id}/assign  → body: { table_id: int }  assign guest to table, check max_seats not exceeded, raise 400 if full
PATCH  /api/admin/guests/{id}/unassign → set guest.table_id = null

### Tables
GET    /api/admin/tables              → list all tables, include guest count and guest list per table
POST   /api/admin/tables              → create: { table_name, max_seats }
PUT    /api/admin/tables/{id}         → update table_name, max_seats
DELETE /api/admin/tables/{id}         → only allow if table has 0 guests assigned, else 400

## Requirements
- Use the same async DB session pattern as Phase 1
- For GET /api/admin/tables, return nested guests per table (SQLAlchemy selectinload or joinedload)
- Cascade delete: when a guest is deleted, their rsvp_response must also be deleted (set up cascade in model or handle explicitly)
- Return meaningful error messages in 400/404 responses: { "detail": "Table is full (max 8 seats)" }
```

---

## Phase 3 — Frontend: Guest Site

> **Goal:** Build the full public-facing guest site. Mobile-first. Sections: Hero with countdown, RSVP search flow, Schedule, Dress Code, Map, and Add to Calendar.

---

### 🤖 AI Prompt — Phase 3

```
Backend phases 1 and 2 are complete. Now build the public guest site in frontend/app/page.tsx and its components. The design must be mobile-first and elegant — this is a wedding/event invitation, so it should feel premium, not like a dashboard.

## Pages and components to build

### app/page.tsx
A single long-scroll page with these sections in order:
1. Hero
2. RSVP
3. Schedule
4. Dress Code
5. Map

### components/Hero.tsx
- Full-viewport section
- Event name (large elegant serif font — use Google Fonts "Cormorant Garamond" via next/font)
- Event date formatted as "Saturday, 14 September 2025"
- Venue name
- Live countdown: Days / Hours / Minutes / Seconds (useEffect + setInterval, recalculates every second)
- "Add to Calendar" button: on click, generate and download an .ics file using the event date and name
  ICS content format:
  BEGIN:VCALENDAR
  VERSION:2.0
  BEGIN:VEVENT
  DTSTART:20250914T180000
  SUMMARY:{EVENT_NAME}
  LOCATION:{VENUE}
  END:VEVENT
  END:VCALENDAR

### components/RsvpSection.tsx
This is the core guest interaction flow. Implement as a multi-step UI:

Step 1 — Search:
  - Text input: "Enter your first or last name"
  - Calls GET /api/guests/search?query={input} after 300ms debounce (minimum 2 chars)
  - Shows a dropdown list of results: "First Last (status badge)"
  - Guest clicks their name → move to Step 2

Step 2 — Confirm identity:
  - Shows "Hello, {first_name} {last_name}!"
  - If already confirmed: show current status and allow changing
  - Two buttons: "✅ I'll be there" / "❌ Can't make it"

Step 3 — Survey (only if "I'll be there"):
  - Dietary preferences: text input
  - Alcohol preference: select (None / Wine / Beer / Cocktails)
  - Needs transport: toggle/checkbox
  - "Submit" button → calls PATCH /api/guests/{id}/rsvp

Step 4 — Thank you screen:
  - If confirmed: "We're so happy you're coming! 🎉"
  - If declined: "Sorry you can't make it. We'll miss you 💙"

### components/Schedule.tsx
Static timeline component. Hardcode placeholder events (easy to edit later):
  18:00 — Guest arrival
  18:30 — Ceremony
  19:30 — Cocktail hour
  20:30 — Dinner & celebration

### components/DressCode.tsx
Display 4 color swatches with HEX codes (use soft, elegant tones as placeholders).
Label: "Dress Code — We'd love if you matched our palette 💛"

### components/MapSection.tsx
An iframe Google Maps embed (use a placeholder coords) with the venue address below.
Link "Open in Google Maps" → opens in new tab.

## lib/api.ts
Implement typed fetch functions:
  searchGuests(query: string): Promise<Guest[]>
  submitRsvp(id: number, payload: RsvpPayload): Promise<Guest>
  getEventInfo(): Promise<EventInfo>

## Requirements
- All components must be TypeScript with proper types
- Use Tailwind CSS only for styling
- Mobile-first: test that it looks good at 375px width
- Loading states on all API calls (spinner or skeleton)
- Error states: "Something went wrong, please try again"
- No layout shift on countdown tick
```

---

## Phase 4 — Frontend: Admin Panel

> **Goal:** Build the protected admin dashboard. Login screen, stats overview, guest list management, and the seating constructor with color-coded table cards.

---

### 🤖 AI Prompt — Phase 4

```
Guest site (Phase 3) is complete. Now build the admin panel under frontend/app/admin/.

## Auth
- frontend/app/admin/layout.tsx:
  On mount, check localStorage for "admin_token"
  If missing → redirect to /admin/login
  Pass token to all API calls via Authorization: Bearer {token} header

- frontend/app/admin/login/page.tsx:
  Simple centered login form: email + password inputs + "Login" button
  Calls POST /auth/login
  On success: save token to localStorage, redirect to /admin
  On failure: show "Invalid credentials"

## Admin pages

### app/admin/page.tsx — Dashboard
Layout: sidebar nav + main content area

Sidebar links:
  - Dashboard (/)
  - Guests (/admin/guests)
  - Seating (/admin/seating)

Main content — Stats cards:
  Total guests | Confirmed | Declined | Pending | Tables
  Fetch from GET /api/admin/stats

### app/admin/guests/page.tsx — Guest List
Full table with columns: Name | Status (badge) | Table assigned | Actions

Status badge colors:
  pending  → yellow
  confirmed → green
  declined → red

Actions per row:
  - Edit (inline edit first_name, last_name)
  - Delete (with confirmation dialog)

Top bar:
  - "Add Guest" button → opens a modal/drawer: first_name + last_name inputs → POST /api/admin/guests
  - Search/filter input (client-side filter on the loaded list)

### app/admin/seating/page.tsx — Seating Constructor
This is the most important admin screen.

Layout:
  Left panel (30%): "Unassigned Guests" — list of all guests with table_id = null
    Each guest shows: "First Last" + status badge (color coded)

  Right panel (70%): Grid of Table Cards
    Each table card shows:
      - Table name + "X / Y seats"
      - List of assigned guests with color-coded status badge
      - "Remove" button per guest (calls PATCH /admin/guests/{id}/unassign)
      - If table is full, show "Full" badge on the card

  "Create Table" button → modal: table_name + max_seats → POST /api/admin/tables
  "Delete Table" button on card → only active if table is empty

  Assigning a guest:
    Click a guest in the Unassigned panel → a dropdown appears: select table → confirm → PATCH /admin/guests/{id}/assign

## lib/api.ts additions
Add admin API functions (all accept token: string param):
  getStats(token), getGuests(token), createGuest(token, data), updateGuest(token, id, data), deleteGuest(token, id)
  getTables(token), createTable(token, data), deleteTable(token, id)
  assignGuest(token, guestId, tableId), unassignGuest(token, guestId)

## Requirements
- All routes under /admin/* must be protected (redirect to /admin/login if no token)
- Optimistic UI updates where possible (update local state before API confirms)
- Show loading skeleton on initial page load
- All destructive actions (delete guest, delete table) require a confirmation step
```

---

## Phase 5 — Docker, Deploy & Production Hardening

> **Goal:** Make the project fully deployable. Finalize Docker configs, add a Caddy reverse proxy with auto-HTTPS, write a one-command deploy script, and document the full deploy process.

---

### 🤖 AI Prompt — Phase 5

```
All application code is complete. Now harden the project for production deployment.

## 1. docker-compose.prod.yml (final version)
Build on top of docker-compose.yml with overrides:

services:
  postgres:
    restart: always
    volumes:
      - pgdata:/var/lib/postgresql/data
    # No ports exposed externally — only internal network

  backend:
    restart: always
    # No volume mount (no hot reload)
    # Run: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
    # Set CORS to only allow the production domain

  frontend:
    restart: always
    # Build the Next.js app and start in production mode
    command: sh -c "npm run build && npm start"
    environment:
      NODE_ENV: production

  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend

volumes:
  pgdata:
  caddy_data:
  caddy_config:

## 2. Caddyfile
Write a Caddyfile for a domain (use {$DOMAIN} env var):
  {$DOMAIN} {
    reverse_proxy /api/* backend:8000
    reverse_proxy /auth/* backend:8000
    reverse_proxy /docs backend:8000
    reverse_proxy * frontend:3000
  }
This gives auto-HTTPS via Let's Encrypt, routes API calls to FastAPI, everything else to Next.js.

## 3. Backend production Dockerfile
Multi-stage build:
  Stage 1: python:3.11-slim, install dependencies from requirements.txt
  Stage 2: copy only the installed packages + app code
  Non-root user
  EXPOSE 8000
  CMD uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2

## 4. Frontend production Dockerfile
Multi-stage build:
  Stage 1: node:20-alpine, install deps, run next build
  Stage 2: copy .next/standalone output (set output: 'standalone' in next.config.ts)
  Non-root user
  EXPOSE 3000
  CMD node server.js

## 5. deploy.sh script
Write a bash script for zero-downtime deploy on a fresh Ubuntu VPS:

#!/bin/bash
set -e

# Usage: ./deploy.sh <your-domain.com>
DOMAIN=$1

echo "→ Installing Docker..."
apt-get update && apt-get install -y docker.io docker-compose-v2

echo "→ Cloning repo..."
git clone <repo-url> /opt/eventinvite
cd /opt/eventinvite

echo "→ Setting up environment..."
cp .env.example .env
sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env
echo "⚠️  Edit /opt/eventinvite/.env now and fill in secrets, then press ENTER to continue"
read

echo "→ Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "→ Running migrations..."
docker compose exec backend alembic upgrade head

echo "✅ Done! Your site is live at https://$DOMAIN"

## 6. Makefile additions
prod-up:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
prod-down:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml down
prod-logs:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
prod-migrate:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head

## 7. Update README.md — "Deploy in 5 Minutes" section
Add a section with these exact steps:
  1. Provision a VPS (Ubuntu 22.04, min 1GB RAM) and point your domain DNS A record to its IP
  2. SSH into the server
  3. curl -o deploy.sh https://raw.githubusercontent.com/yourrepo/main/deploy.sh
  4. chmod +x deploy.sh && ./deploy.sh yourdomain.com
  5. Fill in .env when prompted
  6. Visit https://yourdomain.com — done

## Requirements
- Caddy handles SSL automatically — no manual certbot needed
- Postgres must never be exposed on a public port in production
- All secrets loaded from .env, never hardcoded
- Both Dockerfiles use non-root users
- next.config.ts must have output: 'standalone' for the slim production image
```

---

## Phase Summary

| Phase | What gets built | AI does |
|---|---|---|
| **0** | Full project skeleton, Docker, DB models, all configs | Generates entire architecture in one shot |
| **1** | Public API: event info, guest search, RSVP submit | Implements 3 endpoints with async DB |
| **2** | Admin API: auth, guest CRUD, table CRUD, stats | Implements ~12 endpoints + JWT auth |
| **3** | Guest site: hero, countdown, RSVP flow, info sections | Builds full Next.js public UI, mobile-first |
| **4** | Admin panel: login, dashboard, guest list, seating | Builds protected admin UI with all interactions |
| **5** | Production Docker, Caddy HTTPS, deploy script | One-command deploy to any VPS |

---

## Tips for Using These Prompts

- **Always verify phase N before starting phase N+1.** Run `make up && make migrate` after Phase 0 and confirm `/health` returns 200 before touching Phase 1.
- **Paste the full prompt** — the context at the top of each prompt ("Phase X is complete") helps the AI understand what already exists.
- **Use Cursor or Claude Code** for phases 3–4 with the actual project files open — the AI can read existing types and stay consistent.
- **If something breaks**, paste the error into the AI with: *"Phase X is done but I'm getting this error: [paste]. Fix it without changing anything outside the files mentioned in that phase's prompt."*
- **Phase 5 is last** — don't try to configure production until all features work locally.
