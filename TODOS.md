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

## Payroll CSC/DBM compliance pass (Sep 2026 — reference: src/docs/PAYROLL.md)
- [x] **High — leave monetization is now CSC MC 2 s.2016-compliant (verified live):** amount computed server-side `days × monthlySalary × 0.0481927` (was a client-sent rate with a double-decrement bug); terminal monetizes the full remaining balance; non-terminal capped once/yr + ≤30 days + retain 5 VL; `monetizedDays` persisted; contract + Leave.jsx rate input removed
- [x] **High — LWOP proration (CSC MC 8 s.2014, verified live):** engine emits `LWOP` line using divisor 22 (actual workdays when unpaid > 10) from approved `isLwop` leave + unexcused workday gaps (office-wide closures + approved leave excluded)
- [x] **High — tardiness charged to VL (MC 41 s.1998 §34, verified live):** flat-cash `deductionRate` penalty removed; engine computes tardy days → `ATTD` line with `quantity` (VL days), POST decrements `LeaveCredit VACATION` idempotently (verified 15→11); excess tardiness beyond credit flows into LWOP
- [x] **High — overtime services (CSC-DBM JC 2 s.2015, verified live):** new `OvertimeRequest` model + `/overtime` routes (CRUD + approve + estimate, role-gated); engine emits `OT-PAY` credit line `hours × (S/176) × 1.25|1.5`, on-time-only, min 2h; posted as `PAY` ledger entry (verified ₱894.89)
- [x] **Medium — migration `20260915220000_payroll_csc_compliance`:** `OvertimeRequest` + enums, `LeaveRequest.monetizedDays`, `PayrollDeductionLine.quantity`; money stays Decimal; payslip HTML now splits Additions (credits) vs Deductions

## Leave & Appointments (dive findings — deep dive Sep 2026 pass, verified live)
- [x] **Critical — RBAC gap closed:** `/appointments` fully gated — GET `appointmentsRead`, POST/PATCH/DELETE `appointmentsCRUD` (`requirePermission`, SUPER_ADMIN bypass); frontend `/appointments` route gated `capability="appointmentsCRUD"`
- [x] **Critical — ESS leave-read leak closed (verified):** `GET /ess/leave-requests` returned the WHOLE tenant (EMPLOYEE saw a co-worker's PENDING leave w/ names); now self-scoped to the linked employee via new `leaveRepository.findRequestsByEmployee`. `/leave/requests` + `/leave/credits` stay `leaveApproval`-gated for approvers
- [x] **Critical — leave authz (verified):** `createRequest` self-locks non-approvers to `linkedEmployeeId`; approver files on-behalf only with a valid tenant employee id (`employeeId` coerced, 404 otherwise)
- [x] **High — leave type enum aligned:** Zod contract + ESS contract now match DB `LeaveType` exactly (VACATION/SICK/SPECIAL_PRIVILEGE/MATERNITY/PATERNITY/SOLO_PARENT/SPECIAL_WOMEN/COMPENSATORY); Leave/ESS pickers aligned; no stray `STUDY/EMERGENCY/SPECIAL`
- [x] **High — 500 handler sanitized:** `server.js` error middleware returns generic `message` for ≥500 (no Prisma traces); AppError/`err.message` only under 500
- [x] **High — appointments create fixed end-to-end:** (a) form now posts `startDate`/`endDate` (was `start`/`end` → 400, verified); (b) **discovered + fixed status enum mismatch — `ACTIVE` is NOT in DB `AppointmentStatus`** (PENDING/APPROVED/VERIFIED/ISSUED/EFFECTIVE/ENDED/SEPARATED) so every create 500d; contract default → `PENDING`, service default → `PENDING`, form dropdown updated; service snapshots `name`/`position`/`dept`, coerces dates, employee resolved by tenant-scoped lookup
- [x] **High — leave modal employee picker:** field asked for employee *number* (`EMP-DEFAULT-0001`) but API needs UUID → 404 (verified); now a real employee `<select>` (listEmployees) submitting the UUID
- [x] **Medium — leave workflow integrity (mostly):** `days` recomputed from workdays, overlap + advance-notice + med-cert checks, APPROVED decrements `LeaveCredit` in a tx, `recommendedBy/approvedBy/approvedAt/deniedBy/decisionNote` written, status lifecycle guard (`INVALID_TRANSITION`). **Remaining** — approval decrements without re-checking current balance (can go negative if it changed since filing)
- [x] **Medium — ESS filing flag passthrough (verified):** `POST /ess/leave-requests` Zod+handler now forward `isHalfDay/isLwop/isTerminal/advanceNoticed/documentUrl` (were silently stripped — half-day filed as full day); ESS half-day now stores 0.5 days
- [x] **Medium — static credits → accrual:** `reconcileCredits` seeds fixed annual balances AND accrues from `LeaveRuleConfig.accrualPerMonth/maxCarryOver` on every credits read. **Remaining** — raw `create` (no unique `[tenantId,employeeId,type,year]`) can duplicate under concurrency; prefer idempotent upsert + unique index
- [x] **Medium — appointments soft delete:** `softRemove` (deletedAt) on list/update/remove; effectivity/staging UI still thin (snapshot stale on employee rename)
- [x] **Dead code:** removed unreferenced `leaveRepository.upsertLeaveCredit` (broken composite-id `where`)
- [ ] **Low — no pagination on `/leave/requests`, `/ess/leave-requests`, `/appointments`** (full tenant dump to approvers; 1k-scale needs page/limit like payroll)
- [ ] **Low — ESS Leave Balance math** counts requests (incl. PENDING) not days; power from `LeaveCredit` + approved consumption
- [ ] Subsystem doc: `src/docs/LEAVE_APPOINTMENTS.md` written (surfaces, lifecycle, rules, hardening pass, follow-ups)

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
- [x] **Standalone lobby kiosk** — new `kiosk/` mini React app (Vite, base `/kiosk/`, dev :5176 with `/api` proxy to :4000, build ≈229KB): login-less terminal (Manila clock, keypad, Punch In/Out), punch-key held in-memory per session and sent only when configured, confirmation shows employee name + time + today's hours (backend now echoes `record.employee` on punches). Workflow + nginx deploy chart in `docs/KIOSK.md`. **Verified live**: kiosk build passes, page serves, punches flow through the dev proxy (IN/OUT/Already-punched-in/PUNCH_CONFLICT/BAD_PUNCH_KEY).
- [x] **Punch hardening (concurrency)** — `punchTransition` moved into a Serializable transaction (+1 P2028 retry); OUT closes via conditional `updateMany({ timeOut: null })` so parallel dual-punches can't double-close; `deviceSyncService.ingestLogs` failed applies stay `applied:false` for retry instead of aborting the batch. **Verified live**: 3 parallel INs → 1 success + 2 "Already punched in" + exactly 1 open row; 2 parallel OUTs → 1 success + 400.
- [x] **Punch remark preserved** — `computePunchOutRemark` re-derives from rules on OUT; a tardy IN now shows "Tardiness" through OUT (was overwritten with "Completed"). Manual creates stamp `source: 'MANUAL'`. **Verified live** on punch IN/OUT cycle.
- [x] **Boundary inputs are 400s, not 500s** — `validClock` refine rejects `25:99` (was 500 via `setUTCHours` overflow); `GET /attendance` validates `date=YYYY-MM-DD` and `GET /attendance/my` validates `month=YYYY-MM` (query schemas `listAttendanceSchema`/`myAttendanceSchema` wired via `validate()`); future punches `FUTURE_DATE` 400, dept scope `FORBIDDEN` 403 (AppError, not bare `Error`).
- [x] **`GET /attendance/today` returns open/latest row** — `orderBy: { timeIn: 'desc' }` so multi-punch days surface the current session. **Verified live** after an IN punch.
- [x] **Biometric controller ESM fix** — `biometricController.js` replaced `require()` with a top-level `import` of `attendanceService` (was a ReferenceError 500 on WebAuthn punch verify).
- [x] **Frontend crash/dead-link hardening** — AttendancePortal credential enrolment unwraps `data.credentials` (was `data.data.credentials`, always empty); Devices.jsx save uses the unwrapped `r` (was `r.data`, crashing the list after create/update); CommandPalette dead `/biometric` link now `/biometric-devices`.
- [ ] **Follow-up** — AttendanceRule schedule UI (create/manage rules currently has no form for the 4 new fields); `biometricService.verify` is still a stub returning `valid:true` (WebAuthn flow future).
- [x] **ZK TCP device sync** — new `BiometricDevice` + `BiometricDeviceLog` tables (deduped `[device, logId]` pulls) and `Attendance.source`/`deviceRef` provenance (`MANUAL|IMPORT|PUNCH|DEVICE`) via `lib/zkteco.js` adapter + `deviceSyncService` (pulls port 4370, maps `userId`→`employeeNumber`, applies through the kiosk punch state machine incl. lunch window + rule remarks). `/biometric-devices` CRUD + `POST :id/sync` (ADMIN), poller gated `BIOMETRIC_POLLER=1`, graceful `lastError`/`lastConnectedAt`. Dev-only `POST /dev/device-events` exercises the real ingest+dedup pipeline without hardware. **Verified live**: unreachable host → `502 DEVICE_SYNC_FAILED` + `lastError` persisted; IN 08:05 / OUT 17:10 → `source=DEVICE` row with lunch-aware hours; re-inject → duplicates, no new rows.
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
