# LGU-HRMS Agent Guide

## Commands
- Frontend dev: `cd frontend && npm run dev` → http://localhost:5173
- Frontend build must pass: `cd frontend && npm run build`
- Backend dev: `cd backend && npm run dev` → http://localhost:4000
- Prisma migrate: `cd backend && npx prisma migrate dev`
- Seed: `cd backend && node prisma/seed.js` after migrate
- Color lint: `Get-ChildItem frontend/src -Recurse -Include *.jsx,*.js | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|slate-|gray-|bg-white|text-white'`

## Architecture
- Frontend: React 19 + Vite 5 plain JS, Tailwind 4 design tokens in `frontend/src/index.css`, no hardcoded colors
- Backend: Express 5 ESM, port 4000, Prisma Postgres, JWT access ~15m + refresh rotation
- DB: PostgreSQL 16 via docker-compose, `DATABASE_URL` in `backend/.env`
- Mock layer: `frontend/src/data/mock.js` shapes must match API; backend wiring swaps to `frontend/src/api/`

## Auth & Audit
- JWT verified by `backend/src/middleware/auth.js` `requireAuth`
- `requireAuth` mounted globally after `/api/v1/auth` in `backend/src/routes/index.js`
- Audit middleware `backend/src/middleware/audit.js` writes append-only `AuditLog` on mutating requests
- User → Employee link via `User.externalId` = `Employee.employeeNumber` for ESS

## Key Routes
- `GET /api/v1/ess/profile|payslips|leave-requests|attendance`
- `/api/v1/loans`, `/api/v1/reports/payroll-summary`
- ESS page: `/ess`, IPCR page: `/ipcr`

## Schema Gotchas
- Money fields `Decimal(12,2)`, never JS floats
- Dates stored UTC, displayed Asia/Manila
- Prisma client regeneration is blocked while backend watch runs on Windows; stop backend before `npx prisma generate`
- Seed password: `SEED_DEFAULT_PASSWORD` default `admin123`

## Conventions
- Frontend changes preserve design tokens; zero hardcoded colors
- Commit per unit with conventional messages
- All mutating endpoints must write AuditLog
- Soft delete via `deleted_at` when wiring models
- Sidebar groups: Workforce, RSP, Performance & L&D, Payroll & Benefits, Compliance & Audit, Administration

## Operational
- API 500 on login usually dead DB container → `docker ps` then `docker compose up -d db`
- Never hardcode secrets; use `.env` + `.env.example`
