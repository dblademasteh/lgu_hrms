# LGU-HRMS Todos

## Payroll (dive findings — updated after build)
- [x] **Critical — read leak closed:** new `payrollRead` capability (ADMIN/HR_MANAGER/PAYROLL_OFFICER) gates `/payroll` GETs + `/payroll-deduction` lines + payslip print; verified EMPLOYEE now gets 403. ESS `/ess/payslips` stays employee-scoped.
- [x] **Critical (data integrity)** — salary source added: `Employee.monthlySalary Decimal(12,2)` (migration `20260913140000_payroll_salary_generation`), seed + employee form/table wired. CSC SalaryScale table still future.
- [x] **High** — Payroll page capability-aware (`useUserCapabilities`, `canRun` gates Create/Generate/Approve/Post/Close; route gate `capability="payrollRead"`)
- [x] **High** — run generation: `POST /runs/:id/generate` builds Decimal PayrollItems + deduction lines via `payrollEngine.js`
- [x] **High** — PayrollPeriod CRUD: `POST /payroll/periods` + `PATCH /periods/:id/close` (closed periods block runs), UI modal
- [x] **Medium** — contribution/tax/attendance rules now consumed by the engine (rates = decimal fractions); loans amortizations due in period become `LOAN-*` lines and are marked paid on post
- [x] **Medium** — LedgerEntry written on `POST /runs/:id/post` (PAY + DEDUCTION, running balance, append-only); POSTED runs immutable; approving empty runs + duplicate DRAFT/APPROVED runs per period now blocked
- [x] **Medium** — printable payslip HTML at `GET /payroll/payslips/:itemId/print` (real PDF engine still future)
- [x] **High** — engine tenantId fix (`req.tenantId`, not `req.tenantContext`), post-time amortization settlement fix
- [x] **Scale (1,000 employees)** — `/payroll/runs` paginated (`page`/`limit`/`summary=true`; list omits `deductionLines`, latest run detail on demand); item creation switched to `createManyAndReturn` (bench: 907ms → 126ms @ N=1000); AuditLog `after` capped at 64KB (shape summary beyond); composite `tenantId` indexes on 16 hot tables (migration `20260913160000_payroll_scale_indexes`)
- [ ] **Scale follow-ups** — notifications `useNotifications` still polls summary runs + other list endpoints on mount only; consider a cheap `/notifications` aggregate + polling interval guard
- [ ] **Medium** — rule writes (`/rules` contributions/tax/leave) still lack Zod validation + RBAC matrix (whitelisted route; AGENTS lists it as follow-up)
- [ ] **Medium** — payroll math simplifications to revisit: no proration for half-month/cutoff periods; withholding tax is `(taxable-min)*rate` without the PH base-amount step; employerShare recorded but not posted to ledger; no allowances model (always 0)
- [ ] **Low** — `pdfUrl` still null (print HTML only); `upsertPayslip`/`addLines` API unused by UI (engine owns lines)
- [ ] **Low** — `run-2026-09-*` seed runs + `Test October 2026` posted runs are dev data; consider a dedicated reset script

## Leave & Appointments (dive findings — all confirmed live)
- [ ] **Critical — RBAC gap:** `/appointments` has NO permission gating at all — any authenticated user (EMPLOYEE) can list/delete any appointment; needs `requirePermission` + frontend gate
- [ ] **Critical — leave read leaks (verified):** EMPLOYEE token returned tenant-wide leave requests (PII) + arbitrary employees' credit balances via `GET /leave/requests` + `GET /leave/credits?employeeId=`; needs role gate or self-scoping
- [ ] **Critical — leave authz:** `POST /leave/requests` accepts arbitrary `employeeId` — verified EMPLOYEE filed a PENDING leave for a co-worker; self-lock to linked employee (ESS pattern) or gate on-behalf creation
- [ ] **High — leave type enum mismatch:** Zod contract allows `STUDY/EMERGENCY/SPECIAL` (NOT in DB `LeaveType` → verified HTTP 500 w/ Prisma leak) while DB has `SPECIAL_PRIVILEGE/SPECIAL_WOMEN/COMPENSATORY`; frontend credits panel queries `SPECIAL` (always 0). Align schema + contracts + seed + UI
- [ ] **High — 500 handler leaks DB internals:** `server.js` error middleware returns `err.message` for 500s → clients get raw Prisma invocation traces (verified); return generic message for unexpected errors
- [ ] **High — appointments create is broken end-to-end:** form posts free-text `name` as `employeeId` (FK failure) + raw `YYYY-MM-DD` startDate (Prisma ISO error) → verified HTTP 500; needs employee lookup, server date coercion, and a real contracts file
- [ ] **Medium — leave workflow integrity:** `days` trusted from client (not recomputed from range), no balance/overlap checks, APPROVED doesn't decrement `LeaveCredit`, no approver/decision fields, status re-flippable (no lifecycle guard)
- [ ] **Medium — static credits:** `LeaveRuleConfig.accrualPerMonth/maxCarryOver` never applied; seed hardcodes 15/15; no accrual job or annual reset
- [ ] **Medium — appointments:** hard delete (AGENTS wants soft) + no endDate/expiry/status update in UI (notifications track expiring temporaries); position/dept stored as hybrid free-text/id
- [ ] **Low — no pagination on `/leave/requests` and `/appointments` lists** (both return full tenant dump to approvers)

## Content-Area Audit (SUPER_ADMIN sweep — Sep 2026)
- [x] **Bug (confirmed)** — `GET /performance/competencies` unreachable: shadowed by `GET /performance/:id` (routes/performance.js:22 declares `/:id` before `/competencies` at :28) → controller 404s with id="competencies"; Performance JSX competency catalog never loads. **Fixed**: `/competencies` routes registered before `/:id`; verified 200. Fix: register `/competencies` routes before `/:id`.
- [x] **Sentry not integrated** — AGENTS mandates "use sentry to check errors" but zero Sentry references in frontend/backend; no DSN wiring exists to check app errors. **Integrated (SaaS choice)**: backend `@sentry/node` (lib/sentry.js init guarded by `SENTRY_DSN`, error middleware captures 500s + startup migrations with user/tenant context), frontend `@sentry/react` (lib/sentry.js guarded by `VITE_SENTRY_DSN`, root ErrorBoundary captures render errors); `.env.example` entries added both sides. DSN-less = full no-op.
- [x] **Sentry Vite polish** — `App.jsx` migrated to `createBrowserRouter`+`RouterProvider` wrapped by `sentryWrapCreateBrowserRouter` (route navigations = transactions, `reactRouterBrowserTracingIntegration`); source-map upload via `@sentry/vite-plugin` gated on `VITE_SENTRY_ORG`/`VITE_SENTRY_PROJECT`/`VITE_SENTRY_AUTH_TOKEN`; `build.sourcemap` follows the token; `sendDefaultPii:false` (RA 10173). **Activated**: user-provided DSNs wired (`backend/.env` SENTRY_DSN, `frontend/.env` VITE_SENTRY_DSN), ingest verified 200, old backend key 403-rejection resolved via replacement key; no 403s after backend restart; both servers run in trace mode.
- [x] **Shortcut container scan (SUPER_ADMIN)** — UserDashboard "Shortcuts" card (`UserDashboard.jsx:491`) was dead for SUPER_ADMIN: rank whitelists omitted the platform role and `/ess` route excluded it → bounces. **Fixed**: `SUPER_ADMIN` added to all tenant HRMS route gates in `App.jsx` (employees, organization, payroll, leave, audit, reports, attendance, attendance-portal, appointments, performance, plantilla, vacancy, designation, recruitment, ipcr, disqualifications), UserDashboard `can*` flags include SUPER_ADMIN so cards + shortcut links populate, and Self-Service shortcut hidden for SUPER_ADMIN (no employee linkage; `/ess` stays guarded, backend ESS 404s without externalId).
- [x] **SUPER_ADMIN tenant switcher** — Header `Building2` dropdown lists all tenants (public `GET /tenants`); selection persists `lgu-active-tenant` in localStorage and reloads; `api/client.js` injects `X-Tenant-Id` on every request for SUPER_ADMIN (never for other roles; cleared on logout); Layout tenant banner + Header user menu reflect the override. **Verified** against backend scoping: switched SUPER_ADMIN no-override=12 employees (union/all), `tenant-default`=6, `tenant-solana`=6.
- [ ] **Subdomain map drift** — `backend/src/middleware/tenant.js` `SUBDOMAIN_TENANT_MAP` maps `tarlac`→`tenant-tarlac`, but the seed DB has `SOLANA`/`tenant-solana`; subdomain routing points at a non-existent tenant.

## Attendance hardening (pass — Sep 2026)
- [x] **Authz gap closed** — `GET /` + `POST /` on `/attendance` now `requireRole('ADMIN','HR_MANAGER','DEPARTMENT_HEAD')`; `/my`, `/today`, `/punch` stay self-service. **Verified live**: EMPLOYEE token → 403 on list/create, 200 on `/attendance/my`.
- [x] **HH:MM CSV import** — `timeField` contract now accepts ISO-8601 **or** `HH:MM(:ss)`; time-only strings are interpreted Asia/Manila on the record date via `normalizeTimeField`. **Verified live**: import `08:00/17:00` → 200, stored 08:00 PH.
- [x] **Kiosk tenant lookup** — public punch resolves `tenantCode` case-insensitively; Portal default is `DEFAULT`. **Verified live**: lowercase `default` → punch OK.
- [x] **Manila time boundaries** — new `backend/src/lib/time.js` (`manilaDateKey`, `dateKeyToUtc`, `endOfDateKeyExclusive`, `manilaMinutes`, `manilaTimeOnDate`, `normalizeTimeField`); `biometricPunch` + `getTodayAttendance` now use the Manila calendar day (was UTC `toISOString().slice(0,10)` — a day behind PH after 08:00 UTC). Row `date` stored as the Manila-date UTC-midnight label (matches `@db.Date`).
- [x] **Multi-punch same day** — IN opens a NEW row when all of today's rows are closed; OUT closes the latest open; IN-while-open returns 200 "Already punched in" (same row); OUT-with-no-open → 400 `PUNCH_CONFLICT` (was 500). **Verified live** with 2+ open/close cycles (distinct ids).
- [x] **Rule-driven punch hours & remarks** — punch-out `hours` subtracts the lunch window that falls inside the shift; remarks use rule `workStartMins`/`workEndMins` + lunch (fallbacks 08:00/17:00/12:00–13:00).
- [x] **Public punch hardening** — `punchKey` field + timing-safe check when `BIOMETRIC_PUNCH_KEY` env set (endpoint otherwise stays open); dedicated `punchLimiter` (120/min/IP) on the unauthenticated route.
- [x] **payrollEngine rule-driven** — replaces local `MANILA_OFFSET_MS`/`manilaMinutes` with `lib/time.js`; late threshold uses `AttendanceRule.workStartMins` (fallback 08:00).
- [x] AttendanceRule gains `workStartMins`/`workEndMins`/`lunchStartMins`/`lunchEndMins` Int defaults (migration `20260915062353_attendance_rule_schedule`).
- [ ] **Follow-up** — AttendanceRule schedule UI (create/manage rules currently has no form for the 4 new fields); `biometricService.verify` is still a stub returning `valid:true` (WebAuthn flow future).
- [ ] Deprecate `computePunchHours`-lite logic in `listForEmployee` stat if it duplicates rule math.
- [x] **On-premise login gate** — session-establishing auth gated by `requireOnPremise`: per-tenant `Tenant.allowedIps` CIDR allowlist (migration `20260915120000_tenant_allowed_ips`, seeded `127.0.0.1/32, ::1/128, 10/8, 172.16/12, 192.168/16`), global `ALLOWED_IPS` env fallback, open-by-default when nothing configured; `TRUST_PROXY` support in `server.js`; `GET /tenants/:id` + `PATCH allowedIps` (SUPER_ADMIN, CIDR-validated) and TenantDetail "On-Premise Access" editor showing caller IP; public tenant picker narrowed to exact `GET /tenants` (deeper paths fall through to authenticated router). **Verified live**: localhost/::1 allowed, `X-Forwarded-For: 8.8.8.8` → 403 `ONPREMISE_ONLY`, LAN 192.168.x.x allowed, PATCH replaces list exactly. Note: dev DB runs on native Postgres 18 (host 5432); the docker `lgu_hrms-db-1` container holds an empty schema (drift, not the live DB).
- [ ] **Mock leak** — `useNotifications.js:190` falls back to static `mock.js` `notifications` rows any time all live sources return empty; SUPER_ADMIN with clean inbox sees fake `/audit` notifications. Replace fallback with honest empty state.
- [ ] **Dead mock data** — `frontend/src/data/mock.js` still exports unused arrays (departments, employees, payrollRuns, ledgerEntries, leaveRequests, auditLogs, users, leaveCredits, attendance, appointments, deductionLines, auditDetails, employmentHistory, roleMatrix); only `badgeTone` is consumed. Delete unused exports to satisfy "no dead code".
- [ ] **Dependency audit (pre-existing)** — `npm audit` on frontend: react-router-dom 6.x open redirect (CVE-2025-68470, HIGH) + vite≤6 dev-server (esbuild advisory, MODERATE). Fixes are breaking major bumps (react-router-dom@7, vite@8); plan a migration window.

## High Priority
- [ ] Remove Google Fonts CDN `@import` in `frontend/src/index.css` (on-prem violation; 10 unused families — self-hosted fontsource is the only font source)
- [ ] Print styles: `@media print` with `.print-area`/`.no-print` for COA payslips, Service Records, CSC forms (contract per DESIGN.md §10)
- [ ] Replace remaining `text-gray-300` class hits with design tokens (empty-star rating in IPCR.jsx:43, Performance.jsx:121 — color lint)
- [ ] Extend `requirePermission` to remaining whitelisted routes (`/bonus` writes, `/rules` writes, `/performance`, `/tenants`, `/attendance` writes, `/integrationRequests`)
- [ ] SUPER_ADMIN cannot edit HRMS-scoped matrix rows (throws INVALID_ROLE for null-tenant roles) — allow SU mismatch through or document platform scope

## Medium Priority
- [ ] Define `.select-sm` (used by Users.jsx, undefined in `index.css`)
- [ ] Replace lingering inline-`ChevronDown` select wrappers (Employees.jsx filters) with the `.select` class
- [ ] Fix stale CSS comments referencing removed `Design_Documentation.md` (§2.2–2.6, §2.5) in `index.css`
- [ ] Mobile nav for Sidebar (hidden below `md`; known gap per DESIGN.md §5)
- [ ] Build IPCR/OPCR approval workflow with notifications
- [ ] Attendance rules engine auto-deductions to payroll
- [ ] Competency framework & IDP tracking UI
- [ ] Applicant workflow: screening, interview scheduling, offer letter generation
- [ ] Reports: PDF payslip via pdfmake, Excel export via ExcelJS
- [x] SUPER_ADMIN + capability-aware frontend gates: `/users` route + Sidebar item now check `manageUsersAndRoles` via `useUserCapabilities` (Protected `capability` prop), open to SUPER_ADMIN; Users.jsx edit/matrix controls honor granted capability so custom roles can administer after being granted
- [ ] Frontend page gates (App.jsx Protected) still match rank whitelists for non-matrix pages; consider migrating /employees, /audit, /reports, /payroll, /leave gates to capabilities for custom roles

## Low Priority
- [ ] Refactor Settings accent presets to `var(--accent-*)` tokens (fixes real color-lint hits at `Settings.jsx:39,485`)
- [ ] Employee Self-Service leave filing and payslip download enhancements
- [ ] Loans amortization schedule UI
- [ ] Bulk import employees from CSV
- [ ] Role-based dashboard widgets per user role

## Done
- [x] Permission matrix made real: RolePermission model + migration `20260913120000_role_permissions` (baselined into migration history), `requirePermission()` middleware (SUPER_ADMIN bypass, DEFAULT_PERMISSIONS fallback), capability catalog in `backend/src/shared/permissions.js`, service in `backend/src/services/permissionService.js`
- [x] Matrix UI now API-backed: Users.jsx renders capabilities × roles from `GET /roles/permissions` + `/roles/capabilities`, edits PATCH `/roles/:name/permissions`; removed localStorage `permissions-overrides` + `permissions-changed`; custom roles get capability-gated access
- [x] RBAC gap closed: `/employees` + `/employees/:id/sections` gated to `employeeRecordsCRUD` (was ungated); HR_MANAGER.payrollRuns corrected to false (defaults now mirror backend whitelists)
- [x] New self-service read: `GET /roles/my-permissions` feeds `useUserCapabilities()` (UserDashboard ESS/attendance cards); seed.js writes per-tenant defaults
- [x] User-Employee linking for ESS: User.externalId FK -> Employee.employeeNumber, linkedEmployee relation, create/update validation (409 duplicate, 400 unknown employee), Users page link dropdown + Linked Employee column, seed links admin/hr_manager/payroll_officer
- [x] DetailPane tabs wired to real APIs: History, Appointments, Leave, Leave Credits, Attendance, Payroll, Performance, Training, Loans (read-only relation sections via generic section API, read-only enforcement 405)
- [x] EmployeeForm expanded to CSC 201 sections: Personal, Family, Education, Work Experience, Eligibility, Awards (tabbed form; new FamilyMember/EducationRecord/Award models + generic section API with audit)
- [x] Employees CRUD wired to backend API with AuditLog (POST/PATCH/DELETE, soft delete via deletedAt, migration applied)
- [x] Server-side search/filters/pagination for Employees list (debounced search box; backend supports departmentId/status too)
- [x] JWT auth with refresh rotation and RBAC guards
- [x] Audit middleware wired globally
- [x] Configurable contribution/tax rule tables
- [x] 13th month/Cash Gift/Bonus models
- [x] Loans and salary advances models
- [x] IPCR/OPCR page scaffold
- [x] Attendance rules engine model
- [x] Competency framework & IDP models
- [x] Applicant interview model
- [x] Reports stub
- [x] Employee Self-Service portal
- [x] Employees page CSC alignment start
