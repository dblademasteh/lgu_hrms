# LGU-HRMS Pre-Production Checklist

> Generated 2026-09-11 from a live audit of this repo (backend Express 5 + Prisma 5 + Postgres 16, frontend React 19 + Vite 5). Work top → down: **Blockers first** — the app must not go live with red items open.

## � Multi-tenancy — scaffold live, rollout tracked

> Scaffold landed 2026-09-11 (shared-schema + tenantId). Verified live: JWT carries `tenantId`, cross-tenant reads blocked 403, departments scoped, SUPER_ADMIN platform role gated.

- [x] `Tenant` model + `tenantId` on User/Department, migration `20260911120000_add_tenant_scaffold` applied, default tenant seeded, legacy rows backfilled (5 users, 4 departments).
- [x] `middleware/tenant.js`: `tenantContext` (JWT claim + SUPER_ADMIN override via header/query), `withTenant` scope helper, `stampTenant` write guard.
- [x] Repositories scoped: departments + users full req-thread; JWT + refresh carry `tenantId`; `/tenants` SUPER_ADMIN-only CRUD; Users page tenant column + manager panel; tenant banner in Layout.
- [ ] **Roll out tenantId to remaining 40 models.** Pattern is established (`withTenant`/`stampTenant` + req-thread through service → repository). Priority order: Employee → PayrollRun/Item → LeaveRequest → Attendance → Appointment → Vacancy/Applicant → rest. Each model: schema column + migration + repository scope + controller req-thread. Test cross-tenant reads per model.
- [ ] **Tenant-aware seed + onboarding.** Seed creates per-tenant departments/users; document new-LGU provisioning (create tenant → seed → verify isolation).
- [ ] **Tenant-scoped database tools.** Query console + exports + backups must enforce tenant scope (SUPER_ADMIN sees all; ADMIN sees own tenant only).
- [ ] **Decide tenant resolution.** Current: JWT claim. If multi-LGU login shares usernames, add subdomain (`lgu-a.hrms.gov.ph`) or tenant picker at login.

## �🔴 Blockers — fix before any production deploy

- [ ] **Rotate all secrets.** `backend/.env` still ships `JWT_SECRET="change-me-in-production"`, `JWT_REFRESH_SECRET="change-me-in-production"`. Generate fresh 256-bit values, store in a vault (never in git), set `NODE_ENV=production`. `.env` is gitignored — confirm no secret was ever committed (`git log -p -- backend/.env`).
- [x] **Kill the password-login debug logger.** Done 2026-09-11: request log now gated behind `NODE_ENV !== 'production'` (compose sets `NODE_ENV=production` for the API).
- [x] **Create Dockerfiles.** Done 2026-09-11: `backend/Dockerfile` (node:20-alpine, `prisma migrate deploy` entrypoint) + `frontend/Dockerfile` (Vite build → nginx static + `/api` proxy via `nginx.conf`). Both images build clean. Compose hardened with pgdata volume, healthchecks, restart policies, required-secret guards.
- [x] **Lock down CORS.** Done 2026-09-11: allowlist = `WEB_ORIGIN` + localhost dev ports; evil origins rejected (verified live). Same-origin in prod via nginx `/api` proxy.
- [x] **Restrict brute-force surface.** Done 2026-09-11: zero-dependency `middleware/rateLimit.js` — 30 req/15min per IP on login/login-pin/refresh, 600 req/min global API bucket with `Retry-After` + `X-RateLimit-*` headers. Verified live: 35 rapid logins → 30×401 then 5×429.
- [ ] **Change/rotate seed credentials.** `seed.js` defaults to `admin123` and creates `admin` + role accounts (`hr_manager`, `payroll_officer`, …). On first prod boot: run seed once, force-change every password, delete or disable demo accounts, unset `SEED_DEFAULT_PASSWORD`.
- [ ] **Verify backup → restore round-trip.** You have JSON backup + `pg_dump` SQL dump endpoints, but no verified restore. Perform one full restore to a scratch database and confirm the app boots against it.
- [ ] **Pin dependency versions.** `package.json` uses `^` ranges everywhere (Prisma 5, React 19, Express 5, Zod 4). Commit lockfiles (`package-lock.json`) and verify they are version-controlled; run `npm ci` (not `npm install`) in all images.

## 🟡 High priority — data safety & compliance

- [ ] **Automate nightly backups.** Add a cron/scheduled job hitting `GET /database/dump` (restorable `.sql`) + `GET /database/backup` (JSON), retain 30 days, alert on failure. Today backups are manual button-presses only.
- [ ] **Back up before migrate.** Document and enforce: snapshot → `prisma migrate deploy` → smoke test. The Database tab shows migration drift — make that check part of the deploy gate.
- [ ] **RA 10173 consent + retention story.** AuditLog is append-only (good), and retention purges only login events/revoked sessions. Define and document: data-retention schedule per record class, consent capture for employee PII, breach-response contacts. Surface the policy in Help/Compliance.
- [ ] **PII minimization review.** `exportData`, CSV import/export, and the query console move bulk PII. Confirm role gating (ADMIN-only DB tools ✓), strip exports to need-to-know columns, and log every bulk export (audit middleware covers mutations — verify exports are logged too).
- [ ] **Password policy hardening.** 30-day rotation is enforced at login ✓, but there is no password-history check (users can rotate between two passwords) and no minimum-complexity rule server-side beyond length/regex in Zod. Decide and enforce: history N=5, lockout on repeated failures, admin-initiated reset flow.
- [ ] **PIN policy sign-off.** 4–6 digit PIN + 8-fail lockout is workstation-convenient but weak by design. Get written acceptance: PIN only on trusted on-prem terminals, never for remote access; consider disabling PIN for ADMIN or requiring 2FA alongside it.
- [ ] **2FA rollout.** TOTP setup/verify exists but is optional. Decide: mandatory for ADMIN + PAYROLL_OFFICER before go-live; document enrollment in Help.
- [ ] **Session hygiene.** Access tokens 15m + 7d refresh rotation ✓. Confirm: refresh-token reuse detection (currently absent — a stolen refresh token is valid for 7 days), logout revokes server-side sessions, idle-timeout UX.
- [ ] **Close the `pinHash` gap.** `databaseController.js` `SENSITIVE_FIELDS` now strips `pinHash` ✓ — but re-audit every other serializer (`usersService.list`, reports, ESS) to confirm no credential hash ever leaves the API.

## 🟠 Operations — run it like production

- [ ] **Health/readiness probes.** `/api/v1/health` is a static stub. Extend it (or add `/readyz`) to check DB connectivity + migration sync so orchestrators can gate traffic.
- [ ] **Structured logging + alerting.** Replace `console.log` with JSON logs (request id, user id, latency, status); ship to a collector; alert on 5xx rate, failed logins spike, backup failures, disk > 80%.
- [ ] **Metrics baseline.** Record p50/p95 latency, error rate, DB size, connection-pool usage for one week pre-launch so regressions are detectable.
- [ ] **Uptime/restart policy.** `docker-compose.yml` has no `restart:` policy, no resource limits, no `db` volume (data dies with the container!). Add a named volume for Postgres, `restart: unless-stopped`, memory/CPU limits.
- [ ] **Postgres hardening.** Change `POSTGRES_PASSWORD=postgres`, disable port `5432` exposure to the host (or bind to 127.0.0.1), enable `pg_stat_statements` (your Slow-queries tab needs it), schedule `VACUUM ANALYZE`, confirm WAL archiving if PITR is required.
- [ ] **Frontend production config.** `vite.config.js` has no `build` target/output hardening; `VITE_API_BASE` fallback points at localhost (fine for dev, must be set explicitly in prod). Add `preview`/`build` checks to CI, confirm `npm run build` is clean (it is today — keep it green).
- [ ] **Error tracking.** No client or server error reporter (no Sentry/self-hosted equivalent). At minimum, persist unhandled errors to the audit trail or a log sink — silent 500s are invisible today.
- [ ] **Clock/timezone.** Server times stored UTC ✓, displayed Asia/Manila ✓. Confirm the prod host runs UTC with NTP sync; document the display contract.

## 🔵 Quality — ship with confidence

- [ ] **Zero automated tests.** No `*.test.*` files exist anywhere. Minimum viable: auth flow (login/PIN/refresh/expiry), RBAC denials per role, payroll aggregation math, leave-balance rules, audit-append guarantee. Add `npm test` to both packages and gate merges on it.
- [ ] **Finish or cut TODOS.md medium items.** IPCR/OPCR approvals, attendance auto-deductions, competency/IDP UI, applicant pipeline, PDF/Excel reports, ESS enhancements, loans schedule, CSV bulk import, role dashboards. Either complete, hide behind feature flags, or explicitly defer — no half-wired buttons in prod.
- [ ] **Load test the dashboard.** It fires ~17 parallel queries per load with a single-flight refresh. Verify p95 under expected concurrent users; add pagination/caching where it sags.
- [ ] **Accessibility + responsiveness pass.** Keyboard navigation, focus states, ARIA on modals/tables, 360px mobile layout for ESS (field staff use phones). The UI-UX skill in this repo (`ui-ux-evaluator`) is built for exactly this review.
- [ ] **Help accuracy sweep.** Help documents PIN + rotation ✓ (added this session). Re-verify every guide against the shipped UI the week before launch — stale docs erode trust fast.
- [ ] **Seed vs. production data.** `prisma/seed.js` is demo data (3 employees, role accounts). Decide the prod bootstrap: real plantilla import path (CSV import exists — test it at volume), seed runs exactly once, then is disabled.

## 🟢 Launch week sequence

1. Freeze scope; mark TODOS.md items ship/defer.
2. Rotate secrets; harden compose (volumes, passwords, ports, restart).
3. Add Dockerfiles; `docker compose up --build` green from clean clone.
4. `npm ci` + `npm run build` (frontend) + `prisma migrate deploy` green; record versions.
5. Full backup → scratch restore → smoke test (login, dashboard, payroll summary, leave file, audit write).
6. Rate limiting + CORS + log cleanup deployed; probes wired.
7. UAT with one real department; capture sign-off per role.
8. Nightly backup job live and alerting; on-call rotation posted.
9. Go-live during low-traffic window with rollback plan (previous image + dump on standby).
10. Post-launch day-1 review: error budget, slow queries, login failures, backup success.

## Appendix — verified healthy this session ✅

- 42-table DB manager with read-only guards, search, CSV/JSON export.
- Health / migrations / backup / SQL dump / query console / retention / slow-query tools all live.
- Role-aware dashboard (8 KPIs, RSP/L&D/payroll/compliance sections).
- 30-day password rotation + PIN sign-in with lockout; validation middleware Zod-v4 fix; auth 401 statuses.
- Compliance tab live checks; System tab live status; toast/sidebar pickers.
- Build green (`vite build` ✓), backend `/health` ✓, migrations in sync (19 applied).
