# LGU HRMS

Human Resource Management System for Philippine Local Government Units.

Built with **Express 5 + plain-JS React 19** and a **Tailwind 4 design-system** (full spec: [`AGENTS.MD`](AGENTS.MD)).

---

## Quick Start (setup)

Requirements: **Docker Desktop** (running), **Node.js 18+**, and a populated `backend/.env` (mirror `backend/.env.example`).

### 1. Provision the database

Spin up the bundled PostgreSQL 16 container (published on `localhost:5432`, DB `lgu_hrms`):

```powershell
docker compose up -d db
```

> Another service squatting on `5432`? Change the published port in `docker-compose.yml` and align `backend/.env` -> `DATABASE_URL`.

### 2. Configure the backend

```powershell
copy backend\.env.example backend\.env
```

Fill in secrets (never commit real values). Assumed defaults:

| Variable | Example |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/lgu_hrms?schema=public` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | random long strings |
| `SEED_DEFAULT_PASSWORD` | `admin123` |

### 3. Apply migrations + seed

```powershell
cd backend
npx prisma migrate dev          # create/apply migrations from schema.prisma
node prisma/seed.js             # idempotent: creates one user per role
```

Sign in afterwards with **`admin` / `admin123`** (override via `SEED_DEFAULT_PASSWORD`).

### 4. Run the app

```powershell
# Terminal 1 - API (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 - Web (http://localhost:5173)
cd frontend
npm run dev
```

Prod-build sanity check: `cd frontend && npm run build`.

---

## Common pitfalls

- **API returns 500 on login** => usually the Postgres container is down. Revive it: `docker compose up -d db`, then confirm `docker ps` lists `Up ... 0.0.0.0:5432->5432/tcp`.
- **Missing deps after cloning** => `npm ci` in both `backend/` and `frontend/` (includes `zod` in backend, `lucide-react` in frontend).
- **`EPERM` regenerating Prisma Client** => the running backend (`node --watch`) locks the query-engine DLL. Stop the backend, run `npx prisma generate`, then relaunch.

---

## Architecture

Hybrid layered core with a tactical Master-Detail UI (rationale: [`HRMS_Architectural_Comparison.md`](HRMS_Architectural_Comparison.md)):

```
React 19 SPA (:5173) <--> Express 5 API /api/v1 (:4000) <--> PostgreSQL 16 (Prisma)
                             |> Route -> Controller -> Service -> Repository
                                Zod contracts | RBAC | append-only AuditLog
```

## Structure

- `backend/` - Express 5 API (port 4000), Prisma + PostgreSQL 16 schema, RBAC/audit/Zod-validation middleware, layered controllers/services/repositories
- `frontend/` - React 19 + Vite 5 SPA, Tailwind CSS 4 design system, mock-data fallbacks (`src/data/mock.js`) swapped for `src/api/` calls

## Docs

- `AGENTS.MD` - living build spec + codebase map (**start here**)
- `DESIGN.md` - design system: tokens, components, page specs
- `FEATURE_GAP_ANALYSIS.md` - feature gap matrix + prioritized roadmap
- `HRMS_Architectural_Comparison.md` - architectural rationale
