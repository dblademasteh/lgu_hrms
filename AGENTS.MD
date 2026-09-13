# LGU-HRMS Agent Guide

## Commands
- Frontend dev: `cd frontend && npm run dev` → http://localhost:5173
- Frontend build must pass: `cd frontend && npm run build`
- Backend dev: `cd backend && npm run dev` → http://localhost:4000
- Syntax-check backend fast: `cd backend && node --check src/routes/<name>.js` (no boot needed)
- Prisma migrate: `cd backend && npx prisma migrate dev`
- Seed: `cd backend && node prisma/seed.js` after migrate (multi-tenant for DEFAULT and TARLAC)
- Color lint: `Get-ChildItem frontend/src -Recurse -Include *.jsx,*.js | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|slate-|gray-|bg-white|text-white'`
- Create summary of the output and update into corresponding md in src/docs
- Create TODO's when analysis, search for gaps and bugs, when task is finish update todo's
- Always use DESIGN.MD and skill when polishing, designing and refactoring layout.
- Update Agents.md when user introduce new techniques, workflow etc.
- After analysis, create a interaction with user for possible changes, update and upgrade.
- For a workflow, create a detailed description, implementation and chart. Update into our MD.
- Include checking every component if its wired or working. Never use mock anymore. We develop it.
- Benchmark the app to other existing HRMS, PRIME HR and CSC Memos.
- Create a mock data, not mock workflow, rules etc, create a pool of generated data for testing and seed to database.
- Use sentry to check errors.

## Architecture
- Frontend: React 19 + Vite 5 plain JS, Tailwind 4 design tokens in `frontend/src/index.css`, no hardcoded colors
- Backend: Express 5 ESM, port 4000, Prisma Postgres, JWT access ~15m + refresh rotation
- DB: PostgreSQL 16 via docker-compose, `DATABASE_URL` in `backend/.env`
- Mock layer: `frontend/src/data/mock.js` now only exports `badgeTone()` + `roleMatrix` statics; all pages read `frontend/src/api/`
- Multi-tenancy: shared-schema with `tenantId` on all business tables. Tenant resolution via `backend/src/middleware/tenant.js` tenantContext, withTenant/stampTenant. JWT carries `tenantId`. SUPER_ADMIN can override via `X-Tenant-Id` / query / subdomain. Subdomain map in `SUBDOMAIN_TENANT_MAP`. Tenant provisioning docs: `docs/TENANT_PROVISIONING.md`

## Auth & RBAC
- JWT verified by `backend/src/middleware/auth.js` `requireAuth`
- `requireAuth` mounted globally after `/api/v1/auth` in `backend/src/routes/index.js`
- Role gating: single `requireRole()` in `backend/src/middleware/rbac.js` (do NOT re-add the old copy in `auth.js`)
- Route roles: `/users` ADMIN-only, `/audit` ADMIN+AUDITOR, `/payroll/runs POST|approve` ADMIN+PAYROLL_OFFICER, `/leave PATCH` ADMIN+HR_MANAGER+DEPARTMENT_HEAD, `/bonus` ADMIN+PAYROLL_OFFICER+HR_MANAGER, `/rules` writes ADMIN+HR_MANAGER, `/reports` ADMIN+HR_MANAGER+PAYROLL_OFFICER+AUDITOR
- Frontend mirrors it: `Protected roles={...}` in `frontend/src/App.jsx` + rank-filtered `frontend/src/components/Sidebar.jsx` (ADMIN > HR_MANAGER > PAYROLL_OFFICER > DEPARTMENT_HEAD > AUDITOR)
- Refresh re-reads the user row so the new access token carries the live role; INACTIVE users fail closed
- Audit middleware `backend/src/middleware/audit.js` writes append-only `AuditLog` on mutating requests (shared Prisma client, before/after snapshots, failed attempts logged with `error: true`, failures go to stderr never swallowed)
- User → Employee link via `User.externalId` = `Employee.employeeNumber` for ESS; user `status` is `ACTIVE`/`INACTIVE` uppercase (contract-enforced)
- Tenant isolation enforced in all repositories/services via `withTenant` scope and `stampTenant` on writes

## Key Routes
- `GET /api/v1/ess/profile|payslips|leave-requests|attendance` (POST leave-requests validated)
- `GET /api/v1/loans` (paged, validated POST, GET by id, DELETE pending-only) + `frontend/src/api/loans.js`
- `GET /api/v1/reports/payroll-summary` (real aggregation, CSV download in Reports page)
- `GET /api/v1/payroll/periods|runs` + `GET /runs/:id` + `PATCH /runs/:id/approve` (DRAFT→APPROVED)
- ESS page: `/ess` (leave filing modal wired), IPCR page: `/ipcr` (real columns)
- Tenant routes: `GET /api/v1/tenants` public list for picker, `POST /api/v1/tenants` SUPER_ADMIN only; onboarding portal at `/tenant-register`

## Validation (Zod)
- `backend/src/middleware/validate.js` handles body+params+query; query uses `defineProperty` (Express 5 getter)
- Contracts live in `backend/src/shared/contracts/`: auth, account, employee, users (+status), employeeSections, loans, bonus, payrollDeduction, leave, attendance
- Money = `z.number().positive()`, dates = `YYYY-MM-DD` coerced to UTC in services, never JS floats or `new Date(raw)`

## Schema Gotchas
- Money fields `Decimal(12,2)`, never JS floats
- Dates stored UTC, displayed Asia/Manila
- Prisma client regeneration is blocked while backend watch runs on Windows; stop backend before `npx prisma generate`
- Seed password: `SEED_DEFAULT_PASSWORD` default `admin123`
- `isDependent` (FamilyMember) has a DB default: omit explicit nulls or Prisma 500s (service strips them)
- `yearGraduated` is Int: Postgres silently truncates floats — guard whole numbers client-side

## Conventions
- Frontend changes preserve design tokens; zero hardcoded colors
- Toasts: `const toast = useToast()` + `toast('msg','type')` — never `const { push } = useToast()`
- ConfirmDialog props: `message|confirmLabel|danger` — never `description|confirmText|variant`
- Commit per unit with conventional messages
- All mutating endpoints must write AuditLog (exactly once — global mount only, no per-route duplicates)
- Soft delete via `deleted_at` when wiring models
- Sidebar groups: Workforce, RSP, Performance & L&D, Payroll & Benefits, Compliance & Audit, Administration

## Operational
- API 500 on login usually dead DB container → `docker ps` then `docker compose up -d db`
- Bare 400 `{"details":[]}` on a NEW query validation = Express 5 `req.query` assignment — use `defineProperty`
- Do not re run dev, only if needed.
- Always check terminals for dev to avoid duplicated dev.
- Never hardcode secrets; use `.env` + `.env.example`
