# Cartridge Management System

Monorepo for the MMRCL cartridge inventory application.

## Structure

- `frontend/` — React (Vite) SPA (existing dashboard UI; router/auth wiring comes in a later step)
- `backend/` — FastAPI API (`/api/v1/...`)

## Backend setup (Step 1 — auth)

1. Create PostgreSQL 15+ database, e.g. `cartridge_db`.
2. Copy env file and edit secrets:

   ```bash
   cd backend
   copy .env.example .env
   ```

3. Create a virtualenv, install dependencies, run migrations:

   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   python scripts/create_admin.py
   ```

4. Start the API:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Auth API (`/api/v1`)

| Method | Path | Access |
|--------|------|--------|
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public (valid refresh token) |
| POST | `/auth/logout` | Public (revokes refresh token) |
| GET | `/users/me` | Authenticated |
| GET | `/users` | Admin |
| POST | `/users` | Admin (create user) |
| PATCH | `/users/{id}` | Admin |

Responses use `{ "data": ..., "meta": { "page", "page_size", "total" } }` for list endpoints.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

## Next build step

Backend: Cartridge, Printer, Vendor models + CRUD routers (confirm any open schema questions before proceeding).
