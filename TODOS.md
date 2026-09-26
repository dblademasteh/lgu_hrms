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

## Workforce (deep dive Sep 2026 — reference: src/docs/WORKFORCE.md)
- [x] **Employee Account hardening (done)** — (1) **ESS payslips 500**: `ess.js:38` used undeclared `employeeId` → ReferenceError; now `employee.id`, payslips load. (2) **First-login password change enforced**: `usersService.create` stamps `passwordChangedAt: null` → `authService.passwordAge` reports expired on first login → Login redirects to Account → Security; 30-day policy untouched. (3) **Self-deactivate no longer corrupts link**: `accountService.deactivateAccount` keeps `externalId` (was overwriting `'DEACTIVATED'`); reactivation via `/users` restores ESS. (4) **`assertLinkable` tenant-scoped**: employee ACTIVE lookup + duplicate-link clash both `withTenant` on create/update (was a cross-tenant oracle). Verified: `node --check` all pass, frontend build passes.
- [x] **Only key-position employees can be linked (new)** — added `Employee.keyPosition String?` (migration `20260917033551_add_employee_key_position`) as a tag (e.g. `Mayor`, `HRMO`); `usersService.assertLinkable` rejects links to untagged employees (400 `NOT_KEY_POSITION`); `GET /employees?keyPosition=true` filter + Users.jsx dropdown lists only tagged; EmployeeForm **Key Position** field + DetailPane display; seed tags `EMP-{tenant}-0001` as `HRMO` so the seeded link stays valid. Verified: migration applied + client generated, `node --check` + build pass, key-position query returns both tenants' tagged employees. Cleanup migration `20260917034000_unlink_non_key_position_links` unlinks legacy non-key links + the `DEACTIVATED` sentinel (scoped to externalIds that resolve to a real employee, so OIDC `sub` values are untouched); dev DB had 0 violations, both seeded links intact.
- [x] **Critical — tenant isolation violation in `/employees/:id/sections/*`** (`employeeSectionService.js`): all 13 section models read/written unscoped; `assertEmployee` is a cross-tenant oracle (line 109); `create` omits `stampTenant` → sub-records get `tenantId=NULL` (153-155); update/remove by bare id (165-184); audit before-snapshot inherits the unscoped reads — **fixed**: service now threads `req`, reads via `withTenant` + writes via `stampTenant`, strict existence checks are tenant-scoped; controllers + `audit.js` pass `req`. **Verified live**: family create now stamps `tenantId="tenant-default"`, section reads 200 under tenant
- [x] **High — unvalidated inputs → 500:** `GET /employees` query raw (`employeeController.js:5-7`), section `POST/PATCH` bodies (params only; non-P2xxx errors → 500), `GET /ess/payslips/:itemId/print` param (`ess.js:98`) — **fixed**: `listEmployeesSchema` (page/limit/search/departmentId/status) wired on `GET /`; new `contracts/employeeSections.js` (AGENTS drift closed) with section/record param schemas + flat record-body schema on POST/PATCH; ESS print param validated. **Verified live**: `limit=5000` → 400, valid list → 200, bogus section → 400
- [x] **High — Prisma `P2002`/`P2003` → generic 500:** global-unique keys (`employeeNumber`, `department.code`, `username`) collide cross-tenant; FK violations and department hard-delete-with-children all 500 — map to 409/400 AppErrors — **fixed**: `server.js` centralized `normalizePrismaError` (P2002→409 DUPLICATE, P2003→400, P2025→404, P2000→400) + `employeeSectionService.prismaError` refined (P2002→409, P2003→400, P2025→404). **Verified live**: duplicate `employeeNumber` POST → 409 `DUPLICATE`
- [x] **High — Employees 200-row ceiling (CRITICAL at 1k scale) — FIXED (verified live)** (`Employees.jsx`): list is now server-side — `search`/`departmentId`/`status`/`page` passed to `listEmployees` (all validated by `listEmployeesSchema`, DEPARTMENT_HEAD dept-scope enforced backend-side); stats cards read server counts (two `limit:1` count queries: total + ACTIVE; inactive = total−active); pagination driven by response `total`; search debounced 300ms; dept filter now lists ALL departments from `departmentsApi` (UUID values, was built from page-1 rows only); backend search OR-clause extended with `position.title` so position search keeps working. **Verified live**: `page=2&limit=20` → 20 items/total=1000, `search=Accountant` → 129, `status=ACTIVE` → 900, export-all loop (200/page) reaches all 1000.
- [ ] **High — Department `level` never maintained** (only tenant seed writes it); no soft delete, no `GET /:id`, no parent cycle check, no headcount, no date coercion for concurrence/cscSubmission dates
- [ ] **High — unpaginated sub-resources:** ESS payslips, ESS leave-requests, `/leave/requests`, section lists (except attendance `take:30`)
- [ ] **High — bulk employee upsert** sequential per-row loop, no transaction (`employeeService.js:85-109`)
- [ ] **Medium — UserDashboard** fires `listEnrollments`/`listPrograms` for every role (403 noise, `UserDashboard.jsx:102-103`); attendance "today" uses UTC not Manila (:87); 7 duplicated skeleton blocks
- [ ] **Medium — Organization** Add/Edit modals duplicate markup + duplicate DOM ids; "OSSP Compliance" button no-op (:188); `childCount` dead (:169); catches drop server message; no re-fetch after mutation; local-state mutations bypass reload
- [ ] **Medium — ESS** month flip over-fetches profile/payslips/leave (:80-84); `formatCurrency` decimals inconsistent; `documentUrl` free-text
- [x] **Medium — Employees** skeleton `colSpan={7}` on 11-col table (:190) — **fixed**: colSpan 10 (Email column dropped, see reanalysis); no re-fetch after delete — moot: delete now clears the removed id from `selection` and updates the headcount cards; duplicates MasterTable (structural — future pass)
- [x] **Medium — Employees reanalysis minors (Sep 2026) — FIXED:** duplicate email column removed (kept the Name-cell sub-line); stale selection after delete cleared (removed id dropped from Set + headcount decremented); `getEmployee` + `bulkImportEmployees` dead API exports removed (user chose removal over wiring a CSV import UI); EmployeeForm departments/positions loads now toast on failure (was `catch(() => {})` — silent empty pickers). DetailPane print/attendance-tab items stay open (full-sweep scope, deferred).
- [ ] **Medium — dead code:** `EmployeeProfileModal.jsx` (whole component), `SECTION_NAMES` (`api/employeeSections.js:14`) — still open; `getEmployee` + `bulkImportEmployees` removed (Sep 2026 reanalysis)
- [ ] **Low — `/workforce/stats` aggregate endpoint** (headcount by dept/status, hires, attrition) → Dashboard consumes real numbers; ESS balances from `LeaveCredit` not request-count; 201 File attachments + Service Record print

## Payroll (deep dive Sep 2026 — reference: src/docs/PAYROLL.md)
- [x] **Critical — `/rules/*` tenant leak + no validation** — **fixed**: new `contracts/rules.js` (decimal-string rates/money, precision-matched), `rulesRepository` scopes reads `withTenant` + stamps writes + coerces dates, controller/service thread `req`, route validates. **Verified live**: create → `tenantId="tenant-default"` stamped, list returns owner tenant only, bad rate → 400
- [x] **Critical — payslip print 401** — **fixed** (client transport, no token-in-URL): `openHtmlInNewTab` in `lib/print.js` fetches via axios (auth header attached) then opens a `blob:` URL (`noopener` kept); `payslipPrint`/`getEssPayslipPrint` replace the bare URL helpers in Payroll.jsx + ESS.jsx
- [x] **High — ESS shows DRAFT-run payslips** — **fixed**: `/ess/payslips` filters `run.is.status=POSTED`; print route 404s non-POSTED
- [x] **High — AuditLog bulk cap dead code** — **fixed**: `audit.js` `safeBody` rewritten so `MAX_AUDIT_BODY_BYTES`/`summarizeObject` actually run (generate/post compacted to `{count}`)
- [x] **High — postRun over-marks amortizations + `generatedAt` missing** — **fixed**: amortization fetch scoped `loan.employeeId ∈ run employees`; regenerate sets `generatedAt`
- [ ] **High — cash-side dead:** `LoanAmortization` never created (no approve/disburse); `allowances` always ZERO (`payrollEngine.js:319`); no 13th-month/tax-breakdown on `PayrollItem`; `Bonus` never enters a run
- [ ] **High — under-withholding:** `tax = (taxable−min)×rate` no baseTax/dependents/annualization (`payrollEngine.js:306`); `ContributionRule` linear-only — no GSIS/PhilHealth-cap/Pag-IBIG-tier model
- [ ] **High — manual deduction lines don't reconcile item totals** (`payrollDeductionRepository.js:7-10`); frontend has NO deduction editor (`addLines`/`upsertPayslip` dead exports)
- [ ] **High — no seed rules / no AttendanceRule route** (`tardinessMin` fixed 0, contribution/tax absent out-of-box; `deductionRate` never read)
- [ ] **High — engine-input validation:** money as `z.number()` (`contracts/payrollDeduction.js:8-9`, `loans.js:22`), `overtimeService.js:104-108` JS floats
- [ ] **Medium — payroll runs list no pagination** (frontend, first 20 only; `total` stat can disagree); 8× duplicated `peso()` printers; new-run row shows missing period/items (`Payroll.jsx:102`)
- [ ] **Medium — dead code:** `EmployeeProfileModal.jsx` (no imports), `api/payrollDeduction.js` addLines/upsertPayslip no consumers; AGENTS.md drift — migration `20260913160000_payroll_scale_indexes` does not exist (indexes are in `20260913103813`)

## Reports (deep dive Sep 2026 — reference: src/docs/REPORTS.md)
- [ ] **High — "Standard Reports" is a stub catalogue** (4 hardcoded `data/reports.js` entries; Generate=toast, Preview="not yet generated"; 4 entries but "3 templates" label) and **pdfmake/ExcelJS are not installed** yet `Reports.jsx:56` badges them; Help.jsx + FEATURE_GAP_ANALYSIS.md also over-promise — render or de-claim
- [ ] **High — only ONE backend report endpoint** (`GET /reports/payroll-summary`) — no COA Payroll Register/Journal, remittances (GSIS/Pag-IBIG/PhilHealth/BIR 1601-C), DTR, leave, loans, Service Record; all CSVs are ad-hoc client blobs with divergent quoting/decimals
- [ ] **High — summary shows unposted runs** (`reportsController.js:28-33` latest-by-runDate, no status filter) — exclude non-POSTED like ESS now does
- [ ] **Medium — 5+ duplicated client export blobs** (Reports/Audit/Employees/Disqualifications/Attendance) — shared `lib/export.js` (`downloadCsv` w/ quoting + Manila filename) then adopt
- [ ] **Medium — export hygiene:** filenames use UTC `toISOString().slice(0,10)`; money in CSV should keep 2dp; Preview modal labels a stub as "PDF Document/Excel Workbook"
- [ ] **P2/P3 — server-side report engine:** `GET /reports/payroll-register` (per-employee rows + per-code deduction columns), journal from `LedgerEntry`, remittance groups by `PayrollDeductionLine.code`; then install pdfmake/ExcelJS (or server render) for the catalogue + payslip PDF

## PRIME-HRM Evidence Pack (Sep 2026 — reference: src/docs/PRIME_HRM_EVIDENCE.md)
> Evidence register mapping every PRIME-HRM ER to the live producing feature (page + endpoint + schema). Current self-assessment read: RSP ML2→3, L&D ML1, PM ML2-3, R&R ML1-2. Items below are the pack's gap→roadmap; R&R report items overlap the Reports section.
- [ ] **Cross-cutting — Docs Store (blocks every pillar):** versioned, tenant-scoped document model for office orders, resolutions, MOAs, and policies → files MSB/HRDC constitutions (RSP Governance), L&D policy + Annual L&D Plan (L&D Governance/Planning), R&R program (R&R Governance). Only URL slots today: `Employee.resumeUrl`, `Payslip.pdfUrl`
- [ ] **Cross-cutting — form printers:** CSC Form 33 (appointment), SPMS Form 1, Service Record (CSC 212), COA payslip certificate; reuse `openHtmlInNewTab` transport; DESIGN.md §10 print contract
- [ ] **RSP** — public job-seeker posting portal (`VacancyPublication` is admin-logged today); MSB deliberation/minutes capture (screeningScore + board notes exist, minutes doc doesn't); appointment-time validation eligibility vs vacancy requirements (RSP Pillar B/C/D evid pieces)
- [ ] **L&D — `/learning` deep-dive** — LNA/TNA instrument, annual L&D plan + utilization report by `TrainingEnrollment` (per-employee training history exists in 201), level-1/2 evaluation capture, IDP editor end-to-end (`IDP` model + seed exist)
- [ ] **PM** — OPCR→IPCR cascade depth + sign-off notifications (cascade (`parentReviewId`) modeled; workflow depth to verify); SPMS Form 1 print
- [ ] **Verify-on-site PMCs** — publication flow, appointment-form QA, L&D IDP editor, OPCR cascade & approval workflow, R&R bonus/loans landing (flagged 🟡 in the pack)

## Recruitment Funnel Redesign (Sep 2026)
- [x] **Whole recruitment experience unified** — Recruitment page rebuilt as hiring funnel with three functional tabs: Applicants (master-detail pane + stage strip + Hire modal + single-save score editor + eligibility block), Interviews (schedule/complete/cancel/delete + applicant picker), Vacancies (create/close/remove + status filter + plantilla-item select auto-fill). Scope: "Whole recruitment experience"; direction: "List + detail pane".
- [x] **Route unification** — `/interviews` and `/vacancy` now redirect into `/recruitment?tab=...` (gated on `interviewCRUD` and `recruitmentCRUD`); `Interviews.jsx` and `Vacancy.jsx` deleted; Sidebar RSP group shows single "Recruitment" entry; CommandPalette updated.
- [x] **Design compliance** — funnel follows DESIGN.md §6 page specs + craft-floor rules (Operate surface, token-only colors, font-display/font-mono scale, one .btn-primary per view, ConfirmDialog for destructive, toasts on every action, empty states in every pane).
- [ ] **Live smoke confirm** — run the app, exercise funnel tabs end-to-end (create applicant, schedule interview, create vacancy, advance stage, hire, verify redirects).

## RSP (deep dive Sep 2026 — reference: src/docs/RSP.md)
- [x] **P1 RSP correctness batch — DONE** (backend + frontend, smoke-verified): hire rewrote transactional + enum-safe; interviews contract+page rewritten; tenant assert helper added; appointmentsService+repo patched (itemNo mapping, stampTenant); date coercion on designation; eligibility enum aligned; plantilla status fixed; disqualification list validated; composite uniques added; frontend: Recruitment hiring funnel, Interviews rewritten, Designation rewritten, Plantilla submit wired, Disqualifications CSV fixed, Vacancy dead search removed, Sidebar/CommandPalette unified. Details + strikethroughs in `src/docs/RSP.md`; Evidence Pack statuses in `src/docs/PRIME_HRM_EVIDENCE.md`.
- [ ] **P2 RSP follow-ups** — `findActive` `isBarred` filter; applicant-scoped DIBAR; vacancy auto-close at `closesAt`; MSB minutes artifact; offer-letter/CSC Form 33/designation print; seed fixtures for RSP pages.


## RSP evidence follow-ups
- [ ] RSP pages empty on re-seed (seed only creates PlantillaItem) — add Vacancy/Applicant/Interview/Appointment fixtures as generated mock *data* (not rules/mocks)
- [ ] No offer-letter / CSC Form 33 / designation print; DIBAR `evidenceDocument` not settable; `oraohraReference/cscFormNo/documentUrl` columns unused
- [ ] DIBAR pre-hire gate + applicant watchlist (Disqualification is Employee-only today); eligibility-vs-vacancy match (`Vacancy.eligibilityRequirements` free-text)
- [ ] After P1: update `src/docs/PRIME_HRM_EVIDENCE.md` RSP statuses (interviews/hire flip once generatable)

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

## Hardening Pass (Sep 2026 — verify-and-update)
- [x] ✅ **Subdomain map drift closed**: `SUBDOMAIN_TENANT_MAP` in `backend/src/middleware/tenant.js` now maps `tarlac`/`solana` → `tenant-solana` (matches seed DB). Comment updated to warn keeping in sync with `prisma/seed.js` `tenantsData`. (Previously mapped `tarlac` → non-existent `tenant-tarlac`.)
- [x] ✅ **On-premise SSO gap closed**: `/oidc/login`, `/oidc/callback`, `/oidc/consume` now pass `requireOnPremise` (session-establishing paths were ungated, allowing SSO to bypass office-network allowlist). `/oidc/status` stays public for the login button.
- [x] ✅ **Mock leak audit (negative)**: `useNotifications.js` `fallbackNotifications` is an empty `[]`; when live sources return empty it shows a honest empty feed, never static mock rows. The TODOS note about mock fallback was stale.
- [x] ✅ **Dead mock exports removed**: `frontend/src/data/mock.js` now exports only `badgeTone()` (consumed by badge components). Removed the unused `roleMatrix` export (was never imported anywhere).
- [x] ✅ **Audit `safeBody` cap verified**: `backend/src/middleware/audit.js` `safeBody` caps bodies at 64KB and falls back to `summarizeObject({count})` for large arrays/objects. Failed audit writes go to stderr and never block responses — confirmed no mock leak.
- [ ] **Performance route shadowing**: confirmed NOT shadowing — `/competencies` (line 24) is registered before `/:id` (line 32) in `backend/src/routes/performance.js`. TODOS already marked done.
- [ ] **CORS allowlist**: verified — `server.js` CORS config uses explicit `WEB_ORIGIN` + localhost ports, never wildcard `*`, never reflects arbitrary origins. Hardening confirmed.
- [ ] **Settings.jsx accent hex literals**: `frontend/src/pages/Settings.jsx:41,580` uses hex strings (`#1d4ed8` etc.) for the accent preset picker. These are the actual token values the user selects (applied to `--accent` via inline style), not hardcoded component colors. The "refactor to `var(--accent-*)`" todo is a non-issue — changing them would remove color choice. Marked as design decision.
- [ ] **Attendance list pagination**: `GET /attendance` (`attendanceRepository.findAll`) still returns all rows without pagination despite `listAttendanceSchema` only allowing `date` filter. Medium gap — daily date scope mitigates at small scale, but needs `page`/`limit` for 1k-employee LGUs.

## Workflow
- [x] Installed `farmage/opencode-skills` repository — 66 skills + 13 workflow commands (discovery, planning, execution, retrospectives, common-ground references)
- [x] Documented all workflow commands: `docs/OPENCODE_WORKFLOW_COMMANDS.md` (command reference, workflow chain diagram, phase-by-phase guide, usage examples)

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

## Document Tracking & Management System (DTMS) — Sep 2026
- [x] Backend schema: expanded `Document` model (`status`, `fileSize`, `mimeType`, `description`, `relatedEmployeeId`/`relation`, `publishedBy`/`publishedAt`) + `DocumentStatus` enum
- [x] Backend permissions: `documentsCRUD` capability added to DEFAULT_PERMISSIONS
- [x] Backend middleware: `upload.js` (multer diskStorage to `uploads/documents/`, 25MB limit, fileFilter)
- [x] Backend repository: `documentRepository.js` (Prisma CRUD with withTenant/stampTenant, paginated findMany, setStatus workflow validation, countByStatus)
- [x] Backend service: `documentService.js` (create/update, resolveFilePath with existence check, getStats)
- [x] Backend controller: `documentController.js` (list/get/create/update/remove/setStatus/download/stats)
- [x] Backend contracts: `documents.js` (Zod schemas)
- [x] Backend routes: `documents.js` (main router + publicDownloadRouter for pre-auth download)
- [x] Backend wiring: server.js static `/uploads`, routes/index.js mounts `/doc-download` pre-auth + `/documents` post-auth, auth.js OIDC requireOnPremise
- [x] Frontend API client: `api/documents.js` (documentsApi object)
- [x] Frontend routing: App.jsx `/documents` route (Protected + documentsCRUD capability)
- [x] Frontend navigation: Sidebar + CommandPalette Documents entry
- [x] Frontend page: `pages/Documents.jsx` (filters, table, create/edit modal with upload, status transitions, download, pagination)
- [x] Verify: `npm run build` passes, color lint clean, backend `node --check` all pass
- [x] E2E test: create upload → list → authenticated download → status workflow → public published-only download → archive (36 assertions across two live runs)

### P0 hardening (Sep 2026) — the DTMS was wired but dead in the UI
- [x] List could never render: repo returns `{items,total,page,limit}` but the page read `data.documents || data.data` → always "No documents found"
- [x] Download was doubly broken: page gated on `doc.filePath` (real field is `url`); and `path.resolve(cwd, '/uploads/...')` resolved to the drive root on Windows (leading slash) → every `GET` returned `FILE_MISSING`
- [x] Download is now authenticated: new `GET /documents/:id/download` (staff, any status); the pre-auth `/doc-download/:id/download` is enforced PUBLISHED-only and tenant-scoped via subdomain (fail-closed)
- [x] Removed the public `express.static('/uploads')` mount — files are only served through the tenant/status-checked API
- [x] Document type dropdown synced to the real `DocumentType` enum (`OFFICE_ORDER, POLICY, MSB_CONSTITUTION, LD_PLAN, MINUTES, RESOLUTION, MEMO, AGREEMENT_MOA, SERVICE_RECORD, PAYSLIP, OTHER`)
- [x] Status transitions now role-gated server-side: `PENDING_REVIEW` any capability holder, `APPROVED/REJECTED/PUBLISHED` ADMIN+HR_MANAGER, `ARCHIVED` ADMIN only; `DELETE` delegates to the `ARCHIVED` transition so it can't bypass the state machine
- [x] "Delete" relabeled Archive (soft delete) with workflow + capability gate; success/confirm copy is honest about retention

### DTMS remaining (not P0 — next session)
- [x] `fileSize` is stored in bytes but rendered as `${fileSize} KB` in the table — now `formatBytes()`
- [x] Changing a filter keeps the stale page number (`useEffect [page, filters]`) — `useEffect(() => setPage(1), [filters])`
- [x] `GET /documents/stats` + `documentsApi.stats` exist but are unused (no dashboard cards) — 6 status cards rendered
- [ ] No document seed data (dev DB only has ad-hoc test docs, now archived)
- [x] `CommandPalette` Documents entry is not role-gated (navigation still redirects) — all palette pages now role + capability gated, `Document Access Tracking` added
- [x] `documentService.js` create/update still stores `url` as `/uploads/...`; normalize storage to a relative path when convenient — stores `uploads/documents/<file>`; migration `20260917060000_document_access_log` also strips legacy leading `/`
- [ ] Stale benchmark docs still claim "no document model exists": `PRIME_HRM_EVIDENCE.md` L130/165/185, `HRMS_BENCHMARK.md` L44/47/83, `PRIME_HRM_GAP.md` L25
- [ ] Global audit middleware (`backend/src/middleware/audit.js`) writes `AuditLog` without `tenantId` (always null) — stamp the resolved tenant so audit reads can be tenant-scoped (DTMS timeline currently works around it)

### DTMS feature modules (see `src/docs/modules/dtms/README.md`)
Planning complete. Implemented so far: **Housekeeping (partial)** + **M4**.
- [ ] [Housekeeping](src/docs/modules/dtms/08-housekeeping.md) — phase 0; done: bytes, page reset, stats, palette gating, storage path; pending: seed data, stale benchmark docs
- [x] [M4 Access & Tracking Log](src/docs/modules/dtms/04-access-and-tracking-log.md) — `DocumentAccessLog` + migration, `documentsTrack`, feed/export/timeline endpoints, capture hooks, `/documents/tracking` page (16/16 E2E)
- [ ] [M1 Taxonomy & Folders](src/docs/modules/dtms/01-taxonomy-and-folders.md)
- [ ] [M2 Version History](src/docs/modules/dtms/02-version-history.md)
- [ ] [M3 Routing & Assignment](src/docs/modules/dtms/03-routing-and-assignment.md)
- [ ] [M5 Retention & Disposal](src/docs/modules/dtms/05-retention-and-disposal.md)
- [ ] [M6 Notifications & Escalation](src/docs/modules/dtms/06-notifications-and-escalation.md)

### DTMS deep-dive findings (Sep 2026 harden scan)
Reads-vs-docs drift + error UX + leftover fixtures surfaced in a live scan:
- [ ] **Read gating drift (confirmed 403):** `GET /documents`, `/stats`, `/:id`, `/:id/download` are gated by `requirePermission('documentsCRUD')`, but AGENTS.md + DOCUMENTS.md say "reads require auth only". EMPLOYEE (tested) gets `403` on list — staff cannot browse published documents at all. Decide: (a) open reads to any authenticated user (align to docs), or (b) keep restricted + document the intent in AGENTS/DOCUMENTS.
- [ ] **No employee-facing document browse:** only ADMIN/HR_MANAGER/SUPER_ADMIN see `/documents`. There is no "Published Documents" read-only view for staff; the public `/doc-download/:id/download` requires knowing the UUID+subdomain. If staff should read office orders/policies/payslips, add an ESS/portal published-documents read view (feeds M3 "for information" too).
- [ ] **Opaque toast errors:** `Documents.jsx` `handleStatus`/`handleDelete`/`handleSubmit` toast `e.message` (axios generic "Request failed with status code 409") — the backend's descriptive `{error:{code,message}}` is dropped (`err.response.data.error.message`). Cross-cutting (most pages share this), but DTMS workflow 403/409s are the most confusing. Add a client helper or normalize in `api/client.js`.
- [x] **DTMS error surfacing (partial):** `Documents.jsx` + `DocumentsTracking.jsx` now read `err.response.data.error.message` before falling back — workflow 409/403/save failures show the backend's descriptive text. Deferred app-wide normalization (the other pages still toast generic Axios messages) to its own pass.
- [ ] **Dev-DB leftover mocks:** 5 seeded `Document` rows (Office Order / MSB / LD Plan / Policy / Minutes) point to `https://example.com/...`, all `DRAFT`, no real file — authenticated download 404s `FILE_MISSING`; housekeeping "delete test fixtures" + "seed honest documents with real uploads" still open (pending item above).
- [ ] **`stats` refetch churn:** `Documents.jsx` refetches `GET /documents/stats` on every `[page, filters]` change though counts are tenant-wide — fetch once on mount + after transitions, not per filter/page.
- [ ] **Orphaned files on replace:** `updateDocument` with a new file never unlinks the previous file from disk (storage leak over time). Delete the old file only after the DB update commits.
- [ ] **`tags` filter not applied:** `listContracts.query.tags` is accepted but `documentRepository.findMany` never applies it — either wire it (client sends `tags`) or drop the schema field.
- [ ] **`PRINTED`/`EXPORTED` phantom actions:** `DocumentAccessAction` + tracking filters offer `PRINTED`/`EXPORTED` but no capture point exists (only VIEWED/DOWNLOADED are logged). Wire print/export actions or hide them.
- [ ] **Create/Edit form under-fields:** modal only exposes title/type/employee/description/file; `version`, `effectiveDate`, `tags`, `retentionClass`, `seriesCode` are contract+model supported but absent from the UI (needed by M1/M2/M5 anyway).
- [ ] **Minor harden notes:** `resolveFilePath` uses sync `fs.statSync` (blocking in handler); download sends `Content-Disposition: inline` (public route renders in-browser — consider an `?download=1` attachment flag); `documentController.workflow` builds the map manually — fine, just duplicated from `workflow.js`.
- [ ] [M7 E-Signature](src/docs/modules/dtms/07-e-signature.md)

## Performance & L&D deep-dive findings (Sep 2026 harden scan — verified live, reference: src/docs/PERFORMANCE_LEARNING.md)
### Verified live bugs (backend)
- [x] **Crash — enrollment `IN_PROGRESS` → HTTP 500** — **fixed**: `contracts/training.js` enrollment enum realigned to the DB `EnrollmentStatus` enum (`ENROLLED|COMPLETED|CANCELLED`, dropped `IN_PROGRESS`); live POST with a bogus status now 400 (contract rejection), no longer 500.
- [x] **Duplicate enrollments allowed** — **fixed**: composite UNIQUE `[tenantId, programId, employeeId]` via migration `20260917120000_add_performance_review_and_enrollment_uniques` (deployed) + `findEnrollmentDuplicate` guard in repo/service → live dup POST now 409 (`P2002` mapper), not 201.
- [x] **Enrollment lifecycle dead** — **fixed**: `PATCH /enrollments/:id` (status `ENROLLED→COMPLETED` with `completedAt` stamp, `→CANCELLED`; terminal states guarded → 422) + `DELETE /enrollments/:id` (204) mounted in `routes/training.js` (routes/controllers/service/repo), so the Learning UI can track completion end-to-end.
- [x] **EMPLOYEE reads all reviews (privacy leak)** — **fixed**: `GET /performance` + `/:id` gated by `requirePermission('performanceRead')` (ADMIN/HR_MANAGER/DEPARTMENT_HEAD + SUPER_ADMIN only; `performanceRead` is a real capability now); live `employee-default` → 403, `department_head-default` → 200.
- [x] **Review uniqueness missing** — **fixed**: composite UNIQUE `[tenantId, employeeId, reviewYear, reviewType]` in the same migration (deployed); dev OPCR dupes deduped (4 junk reviews collapsed to 1, kept latest; `remaining duplicate groups = 0`).
- [x] **Dead `parentReviewId` TDZ code** — **fixed**: `performanceService.updatePerformanceReview` now assigns `payload.parentReviewId` after `const payload` (TDZ moved below the declaration, `parentReviewId` block pre-flags parent validation); `updatePerformanceReviewSchema` gained `parentReviewId` so OPCR cascade is settable.

### Frontend wiring gaps (module can't do its job end-to-end)
- [x] **No create-review UI** — **fixed** (`IPCR.jsx` rewrite): "New Review" modal (employee, type, year, period, weights, parent OPCR, comments), auto-selects the new review; `api/performance.js` create/update/delete now called.
- [x] **No status/approve UI** — **fixed**: contextual `WORKFLOW` button groups per status (PLANNING/MONITORING/REVIEW/APPROVED/REJECTED/CANCELLED) calling `updatePerformanceReview(status)`; APPROVED compute + approve controls reachable.
- [x] **Target "Remove" is local-only** — **fixed**: unsaved rows filter locally; persisted rows ConfirmDialog → `removeTarget` server-side DELETE → reload.
- [x] **Part II competencies un-writable** — **fixed**: inline competency picker (score/max/weight) → `addReviewCompetency`; per-row edit+Save → `updateReviewCompetency`; remove → `removeReviewCompetency`.
- [x] **Competency catalog dead** — **fixed**: catalog modal (list + create code/name/description + delete with in-use guard) on the Part II card.
- [x] **Write access only for ADMIN** (`requireRole('ADMIN')` on all review/target/compute routes) — HR_MANAGER & DEPARTMENT_HEAD (the SPMS rater) can't author or rate IPCRs. **Still open — backend matrix** (frontend gates on `performanceCRUD` capability; route gating pending).
- [x] **Print preview is a stub** — **fixed**: `buildIPCRFHtml` (named-color-only SPMS-style IPCRF: meta header, Part I targets + group averages, Part II competencies, Part III summary, signatures) → `openHtmlString` (new blob transport in `lib/print.js`).
- [ ] **Notifications on REVIEW/approve requests** + **mid-year (MONITORING) capture screen** — still future work.

### Dead code / dead navigation
- [x] **Broken Sidebar links under Performance & L&D:** IDP `/idp`, Awards `/awards`, TNA `/tna`, L&D Plans `/ld-plans`, Evaluations `/training-evaluations` — **resolved**: Sidebar group now carries only Performance, IPCR/OPCR, Learning, Attendance (verified Sep 2026 scan); no dead links remain.
- [x] **Route stubs with missing imports (unmounted):** `routes/trainingEvaluations.js`, `awards.js`, `ldPlans.js`, `tna.js` — **resolved**: stub files deleted (routes glob shows none); schema models remain for a deliberate mount-or-delete later.
- [x] **`performanceCRUD` capability referenced but undefined** — **resolved**: `performanceRead` + `performanceCRUD` are real capabilities in `CAPABILITIES`/`DEFAULT_PERMISSIONS` (seeded per tenant); the referencing stubs are gone.
- [ ] **`frontend/src/utils/performance.js` (`adjectivalDisplayName`, `incentiveFlags`) + `performanceEngine.adjectivalDisplayName`/`incentiveFlags` unused** — dead exports (incentive logic PBB/promotion/step not surfaced anywhere).
- [x] **`/performance` + `/training` still not matrix-backed** — **resolved**: `/training` mounts `router.use(requirePermission('trainingCRUD'))` and `/performance` is matrix-backed via `performanceRead`/`performanceCRUD` (verified in `routes/*.js`).
- [x] **Learning.jsx Sidebar item is not rank/capability-gated** — **resolved**: Sidebar entry carries `roles: ['HR_MANAGER','ADMIN']` + `capability: 'trainingCRUD'`.

### Learning (/learning) scan findings — Sep 2026 (verified live, reference: src/docs/PERFORMANCE_LEARNING.md)
- [x] **500 — delete program with enrollments** — **fixed**: `trainingService.deleteProgram` guards with `countEnrollmentsByProgram` → 409 `ENROLLMENTS_EXIST` with count + guidance (verified live: DELETE program-with-enrollments → 409, was raw Prisma FK 500); UI confirm message corrected ("Programs with existing enrollments cannot be deleted — cancel or remove its enrollments first.").
- [x] **Enroll dropdown capped at 50 employees** — **fixed**: `listEmployees({ page: 1, limit: 200 })` in the Learning load; dropdown now lists up to 200 employees.
- [x] **Uncontrolled enroll `<select>`** — **fixed**: controlled via `enrollSelects` keyed by program id; reset to "" after successful enroll (no accidental re-enroll).
- [x] **Stat cards count only the first 50 enrollments** — **fixed**: Enrollments card uses the paginated `total` from the response (`enrollmentsTotal`).
- [x] **No search/filter UI** — **fixed**: debounced (300ms) search box for programs (code/title) + status filter for enrollments wired to the API (`search`, `status` params).
- [ ] **`getProgram` (detail with enrollments) unused** — no program detail view; decide build-or-drop.
- [x] **`fmtDate` no `timeZone: 'Asia/Manila'`** — **fixed**: `toLocaleDateString('en-US', { …, timeZone: 'Asia/Manila' })`.
- [x] **No training seed data** — **fixed**: `seed.js` seeds 8 LGU-relevant programs per tenant (Ethics/ARTA/201-file/SPMS/IT/DRRM/GAD/Payroll, tenant-prefixed codes for the global `code` UNIQUE) + 10 mixed-status enrollments (COMPLETED with `completedAt`, ENROLLED, CANCELLED); verified live: programs=8, enrollments=10.
- [x] **`trainingCRUD` missing from `CAPABILITY_ROUTES`** — **fixed**: `trainingCRUD: ['/training/programs CRUD', '/training/enrollments CRUD']` added to `backend/src/shared/permissions.js`.
- [ ] **ESS has no training surface** — employees cannot see their own training history in the portal (DetailPane Training tab is HR-gated only).
- [ ] **L&D pillar modeled but unwired** — `TrainingEvaluation` (Kirkpatrick L1–L4), `TrainingNeedsAssessment`, `LdPlan` have schema + migrations (`20260916103000`) but no routes/controllers/contracts/UI; mount or delete.

### Design-token nits (don't block)
- [ ] `RatingStars.jsx` uses `text-amber-400` (hardcoded) — swap to a token (e.g. accent/star semantic).
- [x] `IPCR.jsx` `ADJECTIVAL_COLOR` hardcodes `text-emerald-600`/`text-teal-600`/`text-blue-600`/`text-amber-600`/`text-red-600` — **fixed**: `ADJECTIVAL_TONE` maps to `text-success`/`text-accent`/`text-warning`/`text-error`.
- [x] Existing High-Priority TODO ("replace `text-gray-300` hits at IPCR.jsx:43 / Performance.jsx:121") is stale — those lines no longer contain `text-gray-300` (IPCR rewrite removed all `gray-*`).

### Benchmark notes vs CSC SPMS / PRIME-HRM (see doc)
- Engine matches CSC MC No. 6 s. 2012 five-point scale + IPCRF Part I/II/III computation; states PLANNING→MONITORING→REVIEW→APPROVED/REJECTED track the SPMS Appraisal process.
- Gaps: no mid-year (MONITORING) review capture; no rating-sheet/SPMS Form 1 print; no OPCR→IPCR cascade UI (model exists); no sign-off notifications; L&D eval levels (Kirkpatrick 1–2 via `TrainingEvaluation` model) + TNA + L&D plan + IDP all modeled but unmounted/unwired.

## Brand Logo (completed)
- [x] **LGU HRMS logo designed & integrated** — created `logo.svg` (full brand mark: indigo shield + teal capitol building with columns + white people figures + "LGU HRMS" text + tagline), `logo-icon.svg` (icon-only variant for headers/sidebar/favicon), `public/icon.svg` (simplified favicon); integrated into Login page (desktop + mobile headers), Header component, and all Sidebar variants (classic/compact/mobile). Colors use existing design tokens (`--accent` indigo `#1d4ed8`, `--accent-secondary` teal `#0f766e`, white). Documented in `DESIGN.md` §4 "Logo & Brand". `npm run build` passes, `node --check` passes, color lint clean.
