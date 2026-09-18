# Visitor Management System

Full-stack visitor management with registration, approval workflow, QR-based check-in/check-out, and visit logging.

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React + Vite                  |
| Backend  | Python FastAPI                |
| Database | SQLite + SQLAlchemy           |

## Visitor flow

1. **Register** — Visitor submits name, phone, email, selfie, host employee, and purpose (`status: pending`).
2. **Approve / Reject** — Admin approves or rejects the request.
3. **QR issued** — On approval, a unique QR code is generated and the host is emailed via Microsoft Graph.
4. **Check in** — Visitor scans QR at entry (`status: checked_in`); host is emailed.
5. **Check out** — Visitor scans QR again on exit (`status: checked_out`); QR is deactivated and visit is logged.

## Project structure

```
Visitors/
├── backend/          # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py              # App entry point, middleware, routing
│   │   ├── config.py            # Pydantic Settings (.env loading)
│   │   ├── database.py          # SQLAlchemy engine, session, base
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── visitors.py      # Visitor HTTP endpoints (thin, delegate to services)
│   │   │   └── users.py         # Employee lookup HTTP endpoints
│   │   └── services/            # Business logic layer (clean architecture)
│   │       ├── __init__.py
│   │       ├── logger.py        # Centralized logging configuration
│   │       ├── visitor_service.py   # Visitor workflows (register, approve, check-in/out, QR)
│   │       ├── graph_service.py     # Microsoft Graph API (users, sendMail)
│   │       └── notification_service.py # Email notifications (host/visitor)
│   ├── requirements.txt
│   ├── .env.example             # Template for environment variables
│   ├── .env                     # Local secrets (gitignored)
│   ├── visitors.db              # SQLite database (gitignored)
│   └── uploads/                 # Visitor selfie images
└── frontend/         # React (Vite)
    └── src/
        ├── App.jsx
        └── api.js
```

### Folder responsibilities

| Folder/File | Responsibility |
|-------------|----------------|
| `routes/` | HTTP concerns only: request parsing, validation, response formatting, status codes. **No business logic.** |
| `services/` | Pure business logic: state transitions, validation rules, external API calls, notifications. Reusable and testable. |
| `models.py` | SQLAlchemy ORM definitions (database schema). |
| `schemas.py` | Pydantic models for API contracts (request/response validation). |
| `config.py` | Environment-based configuration via Pydantic Settings. |
| `database.py` | SQLAlchemy engine, session factory, base class. |

## Prerequisites

- Python 3.11+
- Node.js 18+

## Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Copy and fill in Microsoft Graph credentials
copy .env.example .env

uvicorn app.main:app --reload --port 8001
```

API docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

## Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

The Vite dev server proxies `/api` and `/uploads` to the backend on port 8001.

## API endpoints

| Method | Path                         | Description              |
|--------|------------------------------|--------------------------|
| GET    | `/api/users`                 | List employees (Microsoft Graph) |
| POST   | `/api/visitors/register`     | Register a new visitor   |
| GET    | `/api/visitors`              | List all visitors        |
| GET    | `/api/visitors/{id}`         | Get visitor by ID        |
| POST   | `/api/visitors/{id}/approve` | Approve pending visitor  |
| POST   | `/api/visitors/{id}/reject`  | Reject pending visitor   |
| POST   | `/api/visitors/check-in`     | Check in via QR token    |
| POST   | `/api/visitors/check-out`    | Check out via QR token   |
| GET    | `/api/visitors/{id}/qr`      | QR code PNG image        |

## Visitor statuses

- `pending` — Awaiting approval
- `approved` — Approved; QR active
- `rejected` — Request denied
- `checked_in` — On premises
- `checked_out` — Visit completed; QR deactivated

## Microsoft Graph integration

Host notifications are sent as real emails via Microsoft Graph `sendMail`, authenticated with MSAL client credentials.

Create `backend/.env` (see `.env.example`):

```env
MS_CLIENT_ID=your-app-client-id
MS_TENANT_ID=your-tenant-id
MS_CLIENT_SECRET=your-client-secret
MS_SERVICE_ACCOUNT_EMAIL=notifications@yourdomain.com
```

**Azure AD app permissions** (application, admin consent required):

- `User.Read.All` — populate the Host Employee dropdown from Graph `/users`
- `Mail.Send` — send host notification emails from the service account mailbox

The registration form loads employees from `GET /api/users`. Each selection stores the host display name and email; all host notification events (new request, approved, rejected, check-in, check-out) email the host via Graph.

## Quick test

1. Start backend and frontend.
2. Register a visitor in the UI.
3. Approve the request — QR code appears in the visitor card.
4. Copy the QR token into the **QR Check-In / Check-Out** panel and click **Check In**.
5. Paste the same token again and click **Check Out** — status becomes `checked_out` and QR is deactivated.