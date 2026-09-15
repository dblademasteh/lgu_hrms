# LGU-HRMS Agent Guide

## Commands
- Frontend dev: `cd frontend && npm run dev` → http://localhost:5173
- Frontend build must pass: `cd frontend && npm run build` (only real "verify" gate)
- Backend dev: `cd backend && npm run dev` → http://localhost:4000
- Backend prod start: `cd backend && npm run start` (node src/server.js)
- Syntax-check backend fast: `cd backend && node --check src/routes/<name>.js` (no boot needed)
- DB up: `docker compose up -d db` (dead DB container = 500s on login)
- Prisma migrate: `cd backend && npx prisma migrate dev`
- Prisma generate: stop backend watch first, then `cd backend && npx prisma generate`
- Prisma studio (DB inspector): `cd backend && npx prisma studio`
- Seed: `cd backend && node prisma/seed.js` after migrate (multi-tenant for DEFAULT and TARLAC)
- No ESLint/typecheck/test runner exists — verify with `npm run build` + `node --check` + color lint
- Color lint: `Get-ChildItem frontend/src -Recurse -Include *.jsx,*.js | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|slate-|gray-|bg-white|text-white'`
- Create summary of the output and update into corresponding md in src/docs
- Create TODO's when analysis, search for gaps and bugs, when task is finish update todo's
- Always use DESIGN.MD and skill when polishing, designing and refactoring layout.
- Run the app: re seed the database.
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
- Multi-tenancy: shared-schema with `tenantId` on all business tables. Tenant resolution via `backend/src/middleware/tenant.js` tenantContext, withTenant/stampTenant. JWT carries `tenantId`. SUPER_ADMIN can override via `X-Tenant-Id` / query / subdomain. Subdomain map in `SUBDOMAIN_TENANT_MAP` (note: currently maps `tarlac`→`tenant-tarlac` but the seed DB has `SOLANA`/`tenant-solana` — drift). SUPER_ADMIN has an in-app tenant switcher: Header `Building2` dropdown lists all tenants from the public `GET /tenants`, stores the override in localStorage `lgu-active-tenant`, and `frontend/src/api/client.js` injects `X-Tenant-Id` on every request when `auth.user.role === 'SUPER_ADMIN'` (cleared on logout; non-SUPER_ADMIN never sends it). Tenant provisioning docs: `docs/TENANT_PROVISIONING.md`

## Auth & RBAC
- JWT verified by `backend/src/middleware/auth.js` `requireAuth`
- `requireAuth` mounted globally after `/api/v1/auth` in `backend/src/routes/index.js`
- Role gating: single `requireRole()` in `backend/src/middleware/rbac.js` (do NOT re-add the old copy in `auth.js`)
- Capability gating: single `requirePermission(...keys)` in `backend/src/middleware/permission.js` — authoritative on core admin routes, backed by the `RolePermission` table with `DEFAULT_PERMISSIONS` fallback (`backend/src/shared/permissions.js`); SUPER_ADMIN bypasses; edits are enforced immediately and apply to custom roles too
- Matrix enforcement (defaults mirror the old role whitelists): `/users`+`/roles` → `manageUsersAndRoles`, `/employees`+`/employees/:id/sections` → `employeeRecordsCRUD`, `/audit` → `auditTrail`, `/reports` → `reports`, `/payroll/runs POST|approve|generate|post`+`/payroll/periods POST|close`+`/payroll-deduction` writes → `payrollRuns`, `/payroll` GETs (`/runs`, `/runs/:id`, `/periods`, `/payslips/:id/print`)+`/payroll-deduction` GET lines → `payrollRead`, `/leave PATCH` → `leaveApproval`; ESS/attendance-portal capabilities are descriptive (self-service, frontend-gated). Effective permissions = `DEFAULT_PERMISSIONS[role]` baseline with explicit `RolePermission` rows overriding (row > default), so new capabilities never false-deny seeded roles.
- Still whitelisted (not yet matrix-backed): `/bonus`, `/rules`, `/performance`, `/tenants`, `/attendance` writes, `/integrationRequests`. `/database` role split: tenant-scoped reads/export/tenant-dump for ADMIN+SUPER_ADMIN, the rest (query, backup, dump, slow-queries, retention, connections, size, create/update/delete/import) SUPER_ADMIN-only — see `backend/src/routes/database.js`
- Matrix reads/writes: `GET /roles/capabilities`, `GET /roles/permissions`, `GET /roles/my-permissions` (self, ungated), `PATCH /roles/:name/permissions`; seeded per tenant in `prisma/seed.js`
- Route roles: `/users` ADMIN-only, `/audit` ADMIN+AUDITOR, `/payroll/runs POST|approve|generate|post`+`/payroll/periods POST|close` ADMIN+PAYROLL_OFFICER, `/payroll` GETs ADMIN+HR_MANAGER+PAYROLL_OFFICER, `/leave PATCH` ADMIN+HR_MANAGER+DEPARTMENT_HEAD, `/bonus` ADMIN+PAYROLL_OFFICER+HR_MANAGER, `/rules` writes ADMIN+HR_MANAGER, `/reports` ADMIN+HR_MANAGER+PAYROLL_OFFICER+AUDITOR
- Frontend mirrors it: `Protected roles={...}` + optional `capability` in `frontend/src/App.jsx` (e.g. `/users` gates on `manageUsersAndRoles`, open to SUPER_ADMIN) + rank-filtered `frontend/src/components/Sidebar.jsx` (ADMIN > HR_MANAGER > PAYROLL_OFFICER > DEPARTMENT_HEAD > AUDITOR; capability-backed items like Users & Roles appear for custom roles once granted); all tenant HRMS routes are open to SUPER_ADMIN (mirrors the backend bypass — matches the Sidebar's "SUPER_ADMIN sees all groups" rule); `/ess` stays excluded for SUPER_ADMIN (no employee linkage, backend ESS 404s without `externalId`) and its dashboard shortcut is hidden; matrix UI in `frontend/src/pages/Users.jsx` reads/writes the API and shows edit controls when `manageUsersAndRoles` is held (no localStorage overrides — `frontend/src/config/permissions.js` only holds rank/badge/can + `useUserCapabilities()`)
- Refresh re-reads the user row so the new access token carries the live role; INACTIVE users fail closed
- Audit middleware `backend/src/middleware/audit.js` writes append-only `AuditLog` on mutating requests (shared Prisma client, before/after snapshots, failed attempts logged with `error: true`, failures go to stderr never swallowed)
- User → Employee link via `User.externalId` = `Employee.employeeNumber` for ESS; user `status` is `ACTIVE`/`INACTIVE` uppercase (contract-enforced)
- Tenant isolation enforced in all repositories/services via `withTenant` scope and `stampTenant` on writes

## Key Routes
- `GET /api/v1/ess/profile|payslips|leave-requests|attendance` (POST leave-requests validated)
- `GET /api/v1/loans` (paged, validated POST, GET by id, DELETE pending-only) + `frontend/src/api/loans.js`
- `GET /api/v1/reports/payroll-summary` (real aggregation, CSV download in Reports page)
- `GET /api/v1/payroll/periods|runs` + `GET /runs/:id` + `PATCH /runs/:id/approve` (DRAFT→APPROVED)
- Payroll lifecycle: `POST /payroll/periods` + `PATCH /periods/:id/close`, `POST /runs/:id/generate` (computes items from `Employee.monthlySalary` + contribution/tax/attendance rules + due loan amortizations, all Decimal), `POST /runs/:id/post` (APPROVED→POSTED: append-only `LedgerEntry`, `Payslip` rows, marks amortizations paid), `GET /payroll/payslips/:itemId/print` (printable payslip HTML). Salary source of truth = `Employee.monthlySalary` (Decimal 12,2)
- Payroll scale posture (≥1k employees): `GET /payroll/runs` is paginated (`page`/`limit`/`summary=true`, cap limit 100); list omits `deductionLines` (fetch `/runs/:id` or deduction lines); item creation batches with `createManyAndReturn` — never per-row `create` loops inside the generate transaction; AuditLog `after` capped at 64KB (bulk responses stored as `{count}` shape summary); composite `tenantId` indexes cover hot payroll reads (migration `20260913160000_payroll_scale_indexes`)
- ESS page: `/ess` (leave filing modal wired), IPCR page: `/ipcr` (real columns)
- Attendance: `GET /` + `POST /` role-gated ADMIN/HR_MANAGER/DEPARTMENT_HEAD (dept scope enforced in repo); self-service `/my`, `/today`, `/punch`; public kiosk `/attendance/public-punch/punch` (no JWT, `punchLimiter` 120/min/IP, optional `punchKey` when `BIOMETRIC_PUNCH_KEY` set, case-insensitive `tenantCode`). Manila-day logic + HH:MM time parsing live in `backend/src/lib/time.js`; punch-IN opens a new row when all of today's rows are closed, punch-OUT closes the latest open and computes hours minus the lunch window; lateness/remarks/payrollEngine use `AttendanceRule` `workStartMins/workEndMins/lunchStartMins/lunchEndMins` (defaults 08:00–17:00, 12:00–13:00). Punch responses carry `record.employee` (name) for the kiosk confirmation screen.
- Standalone attendance kiosk: `kiosk/` is a separate login-less React app (base `/kiosk/`, dev :5176 with `/api` proxy to :4000, built to `kiosk/dist`) for lobby terminals — clock, keypad, Punch In/Out, name/time/hours confirmation; punch key kept in-memory per session, never persisted. Workflow + deploy chart in `docs/KIOSK.md`.
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

## Coding Best Practices
- Never ship a mock or hardcoded workflow: wire to the API layer first, then verify the component actually calls it
- One concern per file: routes = HTTP + validation, repositories = queries, services/controllers = business logic; keep routes thin
- Always use `try/catch` with `next(e)` in async Express handlers; never `catch (e) { console.log(e) }` and swallow
- Validate every external input with Zod (body, params, query) — never trust `req.body`/`req.query` raw
- Money: use Prisma Decimal, coerce to number only for display; dates: broker YYYY-MM-DD and convert to UTC in services, format to Asia/Manila on the UI
- Never build raw SQL; use Prisma with `withTenant` scope on reads and `stampTenant` on writes — any query missing them is a tenant bug
- All mutating routes must flow through the global audit middleware exactly once; no per-route duplicate AuditLog writes
- Prefer constants/enums over magic strings (statuses, roles, leave types); keep them in one source of truth
- Guard against null/optional fields before use (`?.` or explicit defaults); no silent `.map` on possibly-missing arrays
- Keep components presentational: data fetching in hooks/pages/API modules, UI in components, state minimal
- Reuse existing components (MasterTable, DetailPane, badges, ConfirmDialog, toasts) instead of duplicating markup
- Preserve design tokens — never hardcode colors, spacing, or font sizes (`bg-white`, `text-white`, `slate-` are forbidden)
- Run the verify gates before finishing: `npm run build`, `node --check`, color lint
- No dead code: if a module/export becomes unused, remove it or mark it deprecated — never leave leftover mocks
- No secrets in code or commits — `.env` + `.env.example` only; never log tokens/keys
- Commit per unit with conventional messages (`feat|fix|chore|polish|refactor|docs`)

## Dev & Production Best Practices
- **Dev workflow:** edit → verify (`npm run build`, `node --check`, color lint) → commit; don't re-run dev servers unless needed, and check existing terminals first to avoid duplicate watchers
- **Run exactly one dev instance:** stale watchers hold file locks (breaks `prisma generate` on Windows) and mask hot-reload — always reuse running terminals
- **Environment discipline:** config via `.env` (+ `.env.example`); `NODE_ENV` guards dev-only behavior (request logging is off in production); never commit secrets
- **No debug leftovers:** no `console.log` spam in prod paths, no commented-out code, no local mocks — wire the API and remove the fixture
- **Error handling:** centralized error middleware in `server.js` returns `{error:{code,message}}`; services throw with `status`/`code`; never leak stack traces or DB internals to clients
- **Security defaults already in place — keep them:** helmet, CORS allowlist (never wildcard `*` in prod), `authLimiter` on credentials (15m/30) + `apiLimiter` on `/api/` (60s/600), body size cap 10mb
- **On-premise login restriction:** session-establishing auth (`/auth/login`, `/login-pin`, `/refresh`) is gated by `requireOnPremise` (`backend/src/middleware/onPremise.js`) — the caller IP must match the per-tenant `Tenant.allowedIps` CIDR allowlist (managed on the platform Tenant detail page via `GET/PATCH /tenants/:id`, SUPER_ADMIN; `GET /tenants` list stays public for the picker, exact-path only — deeper `/tenants/:id` falls through to the authenticated router). Fallbacks: empty tenant list → global `ALLOWED_IPS` env; both empty → open. Needs `TRUST_PROXY` set in `server.js` (from env) so `req.ip` is the real client behind nginx. Platform SUPER_ADMIN logins fall back to the env allowlist when no tenant is resolved.
- **Rate limiting:** in-memory buckets are single-process only — for multi-instance prod replace with a Redis counter (`backend/src/middleware/rateLimit.js`)
- **Payroll/money integrity:** never compute money outside Decimal; never trust client-sent totals — recompute server-side from stored rates
- **Audit & RBAC in every release:** any new mutating endpoint automatically passes through the global `auditLog` mount; verify with a request, don't assume
- **Frontend prod hygiene:** rely on `npm run build` (Vite) as the release gate; keep design tokens in `index.css`, zero hardcoded colors; validate form input even when backend re-validates
- **Logging:** production ships structured logs via the platform collector (per `server.js`); `NODE_ENV !== 'production'` suppresses per-request spam
- **Health & monitoring:** `GET /api/v1/health` stays alive for LB checks; use Sentry to capture errors in dev and prod
- **Sentry (SaaS):** optional via DSN envs. Backend — `SENTRY_DSN` (init in `backend/src/lib/sentry.js`, wired in `server.js` error middleware for 500s + startup migrations; user/tenant/URL context; `sendDefaultPii:false`). Frontend — `VITE_SENTRY_DSN` (init in `frontend/src/lib/sentry.js`, `main.jsx`; route tracing via `sentryWrapCreateBrowserRouter` on `createBrowserRouter` in `App.jsx` + root `ErrorBoundary` render capture); source maps upload in prod builds via `@sentry/vite-plugin` gated on `VITE_SENTRY_ORG`/`VITE_SENTRY_PROJECT`/`VITE_SENTRY_AUTH_TOKEN` (`vite.config.js`, `build.sourcemap` follows the token). No DSN/token = full no-op; `.env.example` documents all vars on both sides; never commit real DSNs/tokens.

## Operational
- API 500 on login usually dead DB container → `docker ps` then `docker compose up -d db`
- Bare 400 `{"details":[]}` on a NEW query validation = Express 5 `req.query` assignment — use `defineProperty`
- Do not re run dev, only if needed.
- Always check terminals for dev to avoid duplicated dev.
- Never hardcode secrets; use `.env` + `.env.example`

## Do / Don't
**Do:**
- Wire to the API layer first and verify the component actually calls it; reuse `frontend/src/api/*` modules
- Read AGENTS.md + DESIGN.md before touching layout or wiring, and keep both docs updated when you change conventions
- Reuse existing components (`MasterTable`, `DetailPane`, `Tabs`, `Modal`, `ConfirmDialog`, `useToast`, badges) before writing new markup
- Use `requireRole()` from `rbac.js` only, the global `auditLog` mount only, and `withTenant`/`stampTenant` on every query/write
- Use Prisma Decimal for money, YYYY-MM-DD + UTC for dates, Zod for all external input
- Toast every user action, confirm destructive actions, keep one `.btn-primary` per view, preserve design tokens
- Verify with `npm run build` + `node --check` + color lint before finishing; commit per unit with conventional messages
- Keep code in one-getter-wonders… sorry, keep one concern per file (thin routes, repo = queries, service = logic)
- Report drift you find: update the guide, update TODOs, and open an interaction with the user when you spot design/workflow gaps

**Don't:**
- Don't ship mocks, hardcoded workflows, or sample data labeled as real — wire the API or label it honestly
- Don't swallow errors (`catch { console.log }`), don't leak stack traces/DB internals to clients, don't log secrets or tokens
- Don't bypass tenant isolation, RBAC, or the audit trail (adding a mutating route that skips `auditLog` is a release-blocker bug)
- Don't hardcode colors, spacing, or font sizes; no `bg-white`/`text-white`/`slate-`/`gray-` class names (color lint fails)
- Don't compute money with JS floats or trust client-sent totals; don't build raw SQL when Prisma works
- Don't introduce a second styling system (no CSS-in-JS, no UI kit), don't add decorative animation
- Don't duplicate AuditLog writes per route, don't re-add the old `requireRole` copy inside `auth.js`
- Don't run duplicate dev watchers (file locks break prisma generate), don't keep dead code/mock leftovers
- Don't commit directly to an undocumented change — verify, then conventional message
