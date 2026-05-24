# EventInvite

EventInvite is a full-stack event invitation platform built for a single specific event. It combines a beautiful public-facing guest site (with RSVP, countdown, schedule, and map) with a private organizer admin panel for seating management and real-time guest tracking.

## Architecture

* **Backend**: FastAPI (Python), PostgreSQL (SQLAlchemy + Asyncpg + Alembic), JWT Auth.
* **Frontend**: Next.js (App Router), Tailwind CSS, Shadcn UI.
* **Deployment**: Vercel (frontend), Render/Railway (backend), Supabase or self-hosted PostgreSQL.

## User Roles

The system is split into two independent zones backed by a single database.

| Zone | Who | Access |
|---|---|---|
| **Guest Site** | Event attendees | Public, no login required |
| **Admin Panel** | Event organizers | Protected, JWT-authenticated |

---

## Features

### Guest Zone (Public Site)

1. **Hero / Main Screen**
   - Event name, date, venue, and a live countdown timer to the event.
   - "Add to Calendar" button generating an `.ics` file for Apple/Google Calendar.

2. **Information Blocks**
   - **Schedule** — Day-of timeline so guests know what to expect.
   - **Dress Code** — Color palette display (HEX swatches) for dress code guidance.
   - **Map** — Embedded Yandex/Google Maps widget or a styled link to the venue.

3. **RSVP Module**
   - Guest searches for their name from the main screen (autocomplete via `GET /api/guests/search?query=...`).
   - Guest selects their status: **Coming** or **Can't make it**.
   - If **Coming**, an additional survey form appears:
     - Dietary preferences
     - Alcohol preference
     - Transfer/accommodation needed (boolean)
   - Status and survey answers are saved via `PATCH /api/guests/{id}/rsvp`.

### Admin Panel (Organizer Dashboard)

1. **Stats Dashboard**
   - Total guest count, confirmed count, declined count, pending count.

2. **Seating Constructor**
   - Create, rename, and delete tables with a configurable max seat count.
   - Assign guests to tables via dropdown or drag-and-drop.
   - **Unassigned Pool** — guests with no table appear in a separate "No seat yet" list.
   - Remove a guest from a table (resets `table_id` to `null`, returning them to the pool).

3. **Color-Coded Guest Status**
   - 🟢 Green — Confirmed
   - 🟡 Yellow — Pending (no response yet)
   - 🔴 Red — Declined / Removed from table

4. **Guest Management**
   - Add, edit, or remove guests from the master list.
   - Bulk import via CSV (optional stretch goal).

---

## Database Schema (PostgreSQL)

```
┌──────────────┐         ┌──────────────────┐
│    tables    │  1 ───► │      guests      │
│──────────────│    N    │──────────────────│
│ id (PK)      │         │ id (PK)          │
│ table_name   │         │ first_name       │
│ max_seats    │         │ last_name        │
└──────────────┘         │ status           │  ← pending | confirmed | declined
                         │ table_id (FK)    │  ← nullable
                         └────────┬─────────┘
                                  │ 1
                                  ▼ 1
                         ┌──────────────────┐
                         │  rsvp_responses  │
                         │──────────────────│
                         │ id (PK)          │
                         │ guest_id (FK)    │
                         │ dietary_prefs    │
                         │ alcohol_pref     │
                         │ needs_transport  │  ← boolean
                         └──────────────────┘
```

### Table Definitions

**`tables`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID / Serial | Primary key |
| `table_name` | VARCHAR | e.g. "Table 1", "Family" |
| `max_seats` | INTEGER | Seat capacity |

**`guests`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID / Serial | Primary key |
| `first_name` | VARCHAR | |
| `last_name` | VARCHAR | |
| `status` | ENUM | `pending`, `confirmed`, `declined` |
| `table_id` | FK → tables | Nullable — null means unassigned |

**`rsvp_responses`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID / Serial | Primary key |
| `guest_id` | FK → guests | One-to-one |
| `dietary_preferences` | TEXT | Free text |
| `alcohol_preference` | VARCHAR | e.g. "wine", "none" |
| `needs_transport` | BOOLEAN | |

---

## API Endpoints

### Public (Guest Zone)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/guests/search?query=` | Autocomplete guest name search |
| `PATCH` | `/api/guests/{id}/rsvp` | Update RSVP status + survey answers |
| `GET` | `/api/event` | Fetch public event info (name, date, venue) |

### Protected (Admin Panel, JWT required)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Admin login, returns JWT |
| `GET` | `/api/admin/guests` | Full guest list with statuses |
| `POST` | `/api/admin/guests` | Add a new guest |
| `PUT` | `/api/admin/guests/{id}` | Edit guest details |
| `DELETE` | `/api/admin/guests/{id}` | Remove a guest |
| `GET` | `/api/admin/tables` | List all tables |
| `POST` | `/api/admin/tables` | Create a new table |
| `DELETE` | `/api/admin/tables/{id}` | Delete a table |
| `PATCH` | `/api/admin/guests/{id}/assign` | Assign guest to a table |
| `PATCH` | `/api/admin/guests/{id}/unassign` | Remove guest from their table |
| `GET` | `/api/admin/stats` | Dashboard stats (totals by status) |

---

## Prerequisites

* Docker & Docker Compose
* Node.js 18+
* Python 3.11+

## Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd EventInvite
   ```

2. **Environment Setup:**

   Create `backend/.env`:
   ```env
   # PostgreSQL
   DATABASE_URL=postgresql+asyncpg://eventinvite:secret@localhost:5432/eventinvite

   # JWT
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE_MINUTES=60

   # Event Config
   EVENT_NAME=Your Event Name
   EVENT_DATE=2025-09-14T18:00:00

   # Frontend
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Start the containers:**
   ```bash
   docker-compose up -d --build
   ```
   This will spin up:
   - `postgres` on port `5432`
   - `backend` on port `8000`
   - `frontend` on port `3000`

4. **Run migrations:**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. **Access the Application:**
   - **Guest Site**: `http://localhost:3000`
   - **Admin Panel**: `http://localhost:3000/admin`
   - **API Docs (Swagger)**: `http://localhost:8000/docs`

---

## Development Roadmap

### Stage 1 — Backend Foundation
- [x] Project init, Alembic migration setup
- [ ] DB models: `Guest`, `Table`, `RsvpResponse`
- [ ] Guest search endpoint with ILIKE query
- [ ] RSVP PATCH endpoint (status + survey)
- [ ] Full CRUD for tables and guests
- [ ] JWT auth for admin routes
- [ ] Stats aggregation endpoint

### Stage 2 — Guest Zone (Frontend MVP)
- [ ] Hero screen: event info + countdown timer (`useEffect` + `setInterval`)
- [ ] Guest name search with autocomplete
- [ ] RSVP confirmation flow (status buttons + conditional survey form)
- [ ] "Add to Calendar" button (`.ics` generation)

### Stage 3 — Admin Panel (Frontend)
- [ ] Login screen with JWT storage
- [ ] Stats dashboard (total, confirmed, declined, pending)
- [ ] Table constructor (create, rename, delete)
- [ ] Guest list per table with color-coded status badges
- [ ] Assign/unassign guest to table (dropdown or drag-and-drop)

### Stage 4 — Polish & Content
- [ ] Dress code color palette block
- [ ] Event schedule / timeline block
- [ ] Map widget (Google/Yandex embed)
- [ ] Mobile-first responsive layout (guests will primarily use phones)
- [ ] CSV bulk guest import for admin

---

## Project Structure

```
EventInvite/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── public.py       # Guest search, RSVP
│   │   │   └── admin.py        # Protected CRUD routes
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── core/
│   │   │   └── auth.py         # JWT logic
│   │   └── main.py
│   ├── alembic/
│   ├── Dockerfile
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Guest site (hero, RSVP, info blocks)
│   │   └── admin/
│   │       ├── page.tsx        # Admin dashboard
│   │       ├── guests/         # Guest management
│   │       └── tables/         # Seating constructor
│   ├── components/
│   │   ├── Countdown.tsx
│   │   ├── GuestSearch.tsx
│   │   ├── RsvpForm.tsx
│   │   ├── TableCard.tsx
│   │   └── GuestBadge.tsx
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Production Deployment

1. Deploy the Next.js frontend to **Vercel** (connect GitHub repo, auto-deploys).
2. Deploy the FastAPI backend to **Render** or **Railway**.
3. Use **Supabase** or a managed PostgreSQL instance for the database.
4. Set all environment variables in your hosting provider's dashboard.
5. Update `NEXT_PUBLIC_API_URL` to the deployed backend URL.
6. Change all default secrets (`JWT_SECRET`, DB passwords).
7. Ensure the backend is served over HTTPS for secure cookie/JWT handling.

> **Note:** Since this is a single-event site, 90%+ of guests will access it from a smartphone. Prioritize mobile-first design throughout.
