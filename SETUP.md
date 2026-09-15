# LGU HRMS — Initial Setup Guide

Self-contained setup for the **lgu_hrms** workspace: multi-tenant Human Resource Management System (HRMS) for LGUs, with payroll, leave, attendance, biometric device sync, ESS portal, and a standalone attendance kiosk.

## Architecture at a glance

| Service | Tech | Port | Notes |
|---------|------|------|-------|
| Backend | Express 5 (ESM) + Prisma + PostgreSQL 16 | 4000 | `node --watch src/server.js` in dev |
| Frontend | React 19 + Vite 5 + Tailwind 4 | 5173 | Vite dev server, proxies `/api` → :4000 |
| Kiosk | Separate login-less React + Vite app | 5176 | Lobby attendance terminal; builds to `kiosk/dist` |
| Database | postgres:16 (docker compose) | 5432 | Shared-schema multi-tenant |

---

## Prerequisites

- **Node.js 18+** (dev uses `node --watch`, so 18.11+; Node 20 LTS recommended)
- **Docker Desktop** (for the PostgreSQL 16 container)
- **Git**

---

## 1. Clone and install dependencies

```bash
git clone <repo-url> lgu_hrms
cd lgu_hrms

# Backend + frontend + kiosk
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd kiosk   && npm install && cd ..
```

> Missing packages from a branch pull (`Cannot find package 'x'...`) is usually just an un-run `npm install` — reinstall after every `git pull`.

---

## 2. Create environment files

**Root `.env`** (for docker compose — must contain `POSTGRES_PASSWORD` or compose will refuse to start):

```env
POSTGRES_PASSWORD=postgres
POSTGRES_DB=lgu_hrms
```

**`backend/.env`** (copy of `backend/.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lgu_hrms?schema=public"
JWT_SECRET="some-long-random-hex-32-bytes"        # openssl rand -hex 32
JWT_REFRESH_SECRET="some-other-long-random-hex"   # openssl rand -hex 32
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="lgu_hrms"
WEB_ORIGIN="http://localhost"
VITE_API_BASE="/api/v1"
WEB_PORT=80
SEED_DEFAULT_PASSWORD="admin123"
PORT=4000
NODE_ENV=development
ALLOWED_IPS=""
TRUST_PROXY="1"
BIOMETRIC_PUNCH_KEY=""        # optional shared kiosk secret (see §8)
BIOMETRIC_POLLER="0"          # 1 = poll ZK terminals automatically
BIOMETRIC_POLL_MS="30000"
SENTRY_DSN=""                 # optional error tracking
SENTRY_TRACES_SAMPLE_RATE="1.0"
```

**`frontend/.env`** (optional, copy of `frontend/.env.example`): `VITE_SENTRY_DSN` etc. — all empty = no-op sentry, safe to skip.

**`kiosk/.env`** (optional): `VITE_API_BASE="/api/v1"` (defaults to same-origin; dev proxy to :4000 is already wired in `kiosk/vite.config.js`).

Never commit real secrets — `.env*` is gitignored.

---

## 3. Start the database

```bash
# dev override publishes 5432 to the host so local node/prod servers can connect
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

> `docker-compose.yml` is production-shaped: services publish no host ports by default (proxy/container networking only) and require `POSTGRES_PASSWORD`/`JWT_SECRET`/`JWT_REFRESH_SECRET`. The `docker-compose.dev.yml` override re-adds host port publishing, source mounts and watch mode for local development — always pass both files. For the base (no host ports) just drop the `-f` override: `docker compose up -d db`.

Verify: `docker ps` → the `db` container should be `Up` and `healthy`.

**A dead DB container is the #1 cause of 500s on login.** Fix: `docker compose up -d db`.

---

## 4. Migrate, generate, seed

```bash
cd backend

# Apply pending schema migrations (creates the DB if needed)
npx prisma migrate dev

# Regenerate the Prisma client
npx prisma generate

# Seed multi-tenant demo data (idempotent — safe to re-run)
node prisma/seed.js
```

> Recent migrations added for RSP & payroll CSC compliance:
> - `20260915240000_add_employee_government_ids` — SSS/PhilHealth/Pag-IBIG/TIN
> - `20260915220000_payroll_csc_compliance` — overtime, leave monetization
> - `20260915230000_perf_spms_compliance` — IPCR/SPMS
> - `20260915160000_leave_credit_unique_constraint`

> **Windows note:** Prisma client generation is blocked while the backend watch process runs (file locks). Stop the backend dev server first, then `npx prisma generate`, then restart it.

Running the Prisma Studio DB inspector: `cd backend && npx prisma studio`.

---

## 5. Start the dev servers

```bash
# Terminal 1 — Backend  (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm run dev

# Terminal 3 — Kiosk    (http://localhost:5176, optional)
cd kiosk
npm run dev
```

Open **http://localhost:5173**.

Run exactly one instance of each — duplicate watchers hold file locks on Windows and mask hot-reload.

---

## 6. Seed accounts

Default password: **`admin123`** (override with `SEED_DEFAULT_PASSWORD` in `backend/.env`).

The seed creates two tenants — **DEFAULT** (Default LGU) and **SOLANA** (Municipality of Solana) — each with the same account pattern (`<role>-<tenant-code-lowercase>`):

| Username (DEFAULT tenant) | Role |
|---------------------------|------|
| `admin-default` | ADMIN |
| `hr_manager-default` | HR_MANAGER |
| `payroll_officer-default` | PAYROLL_OFFICER |
| `department_head-default` | DEPARTMENT_HEAD |
| `auditor-default` | AUDITOR |
| `employee-default` | EMPLOYEE (ESS self-service) |

Same accounts with `-solana` for the SOLANA tenant. All default to `admin123`.

Platform account (no tenant — sees all tenants, tenant management, database tools):

| Username | Role |
|----------|------|
| `superadmin` | SUPER_ADMIN |

All default to `admin123`.

---

## 7. Verify everything works

```
GET http://localhost:4000/api/v1/health   → {"status":"ok",...}
GET http://localhost:5173                 → HRMS login page
GET http://localhost:5176                 → kiosk confirmation screen
```

Release gates before committing:

```bash
cd frontend && npm run build        # Vite production build must pass
cd backend  && node --check src/server.js   # + node --check src/routes/*.js
# color lint (no hardcoded colors; `slate-` false-positives inside -translate-* are OK):
Get-ChildItem frontend/src -Recurse -Include *.jsx,*.js | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|slate-|gray-|bg-white|text-white'
```

---

## 8. Optional subsystems

### Biometric device sync (ZK TCP)
1. Register devices in the app: **Biometric Devices** page (ADMIN).
2. Set `BIOMETRIC_POLLER=1` in `backend/.env` to run the automatic pull loop (default every 30s). Devices must be reachable on port 4370.
3. Pulls are de-duplicated on `[deviceId, deviceLogId]` and replayed through the same attendance state machine as manual punches.

Workflow + architecture: `docs/DEVICES.md` and `docs/ATTENDANCE.md`.

### Attendance kiosk
- Dev: `cd kiosk && npm run dev` → :5176.
- Production build: `cd kiosk && npm run build` → `kiosk/dist`, served under `/kiosk/`.
- Optionally protect the public punch endpoint with a shared key: set `BIOMETRIC_PUNCH_KEY`; kiosks send it per session as `punchKey`.

Workflow + deploy chart: `docs/KIOSK.md`.

### On-premise login restriction
- Session-establishing auth (`/auth/login`, `/login-pin`, `/refresh`) is gated by the caller IP matching the tenant's CIDR `allowedIps` allowlist (managed on the platform Tenant page; fallback global `ALLOWED_IPS` env).
- Set `TRUST_PROXY=1` (or `loopback, 10.0.0.0/8`) so `req.ip` is the real client behind nginx.
- Empty allowlist = open. Local seed tenants already include loopback + RFC1918 ranges.

### Sentry error tracking (optional)
- Backend: set `SENTRY_DSN` (+ `SENTRY_TRACES_SAMPLE_RATE`).
- Frontend: set `VITE_SENTRY_DSN` (+ org/project/auth token for source-map upload in prod builds).
- No DSN/token = full no-op; never commit real DSNs.

---

## 9. Multi-tenancy quick notes

- Shared-schema, row-level `tenantId` on business tables; JWT carries the tenant.
- Tenant resolution: `backend/src/middleware/tenant.js` (`tenantContext`, `withTenant`/`stampTenant`).
- SUPER_ADMIN can override tenant per-request (`X-Tenant-Id` header / the Header tenant-switcher).
- Tenant provisioning details: `src/docs/TENANT_PROVISIONING.md`.

---

## 10. Production Docker stack

The base compose is production-shaped:

```bash
# Root .env must provide: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET (+ optional WEB_ORIGIN, WEB_PORT, SEED_DEFAULT_PASSWORD, DB_CONTAINER)
docker compose up --build
```

- `api` = backend container; runs `prisma migrate deploy` on startup in production and fails fast if migrations fail.
- `web` = frontend nginx container on `${WEB_PORT:-80}`.
- DB never publishes its port in prod (dev override re-adds it).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 on login | DB container dead → `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db` |
| `POSTGRES_PASSWORD: Set ... in the environment` | Create root `.env` with `POSTGRES_PASSWORD` |
| `Cannot find package 'x'` after pull | `npm install` (frontend/backend/kiosk) |
| `prisma generate` hangs/fails on Windows | Stop the backend watch process first, then run it |
| Port 4000/5173/5176 already in use | `netstat -ano \| findstr :PORT` then `taskkill /F /PID <pid>` |
| Bare `400 {"details":[]}` on new query validation | Express 5 `req.query` assignment — the schema must use `defineProperty` (see `backend/src/middleware/validate.js`) |
| Kiosk / biometric features 500 | Missing deps: ensure `npm install` ran in `backend` (`zkteco-js` is a dynamic import — fails only when used) |

---

## Related docs

- `AGENTS.MD` — agent/development conventions, command reference
- `src/docs/DESIGN.md` — design tokens + UI conventions
- `docs/ATTENDANCE.md`, `docs/DEVICES.md`, `docs/KIOSK.md` — attendance + biometric subsystems
- `src/docs/TENANT_PROVISIONING.md` — multi-tenant onboarding
- `README.md` — product overview