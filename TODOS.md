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
- [x] **Critical — tenant isolation violation in `/employees/:id/sections/*`** (`employeeSectionService.js`): all 13 section models read/written unscoped; `assertEmployee` is a cross-tenant oracle (line 109); `create` omits `stampTenant` → sub-records get `tenantId=NULL` (153-155); update/remove by bare id (165-184); audit before-snapshot inherits the unscoped reads — **fixed**: service now threads `req`, reads via `withTenant` + writes via `stampTenant`, strict existence checks are tenant-scoped; controllers + `audit.js` pass `req`. **Verified live**: family create now stamps `tenantId="tenant-default"`, section reads 200 under tenant
- [x] **High — unvalidated inputs → 500:** `GET /employees` query raw (`employeeController.js:5-7`), section `POST/PATCH` bodies (params only; non-P2xxx errors → 500), `GET /ess/payslips/:itemId/print` param (`ess.js:98`) — **fixed**: `listEmployeesSchema` (page/limit/search/departmentId/status) wired on `GET /`; new `contracts/employeeSections.js` (AGENTS drift closed) with section/record param schemas + flat record-body schema on POST/PATCH; ESS print param validated. **Verified live**: `limit=5000` → 400, valid list → 200, bogus section → 400
- [x] **High — Prisma `P2002`/`P2003` → generic 500:** global-unique keys (`employeeNumber`, `department.code`, `username`) collide cross-tenant; FK violations and department hard-delete-with-children all 500 — map to 409/400 AppErrors — **fixed**: `server.js` centralized `normalizePrismaError` (P2002→409 DUPLICATE, P2003→400, P2025→404, P2000→400) + `employeeSectionService.prismaError` refined (P2002→409, P2003→400, P2025→404). **Verified live**: duplicate `employeeNumber` POST → 409 `DUPLICATE`
- [ ] **High — Employees `limit:500` vs backend cap 200** (`Employees.jsx:55` / `employeeController.js:6`): stats/dept filter/CSV silently see only first 200; `total` ignored; no headcount/stats endpoint exists
- [ ] **High — Department `level` never maintained** (only tenant seed writes it); no soft delete, no `GET /:id`, no parent cycle check, no headcount, no date coercion for concurrence/cscSubmission dates
- [ ] **High — unpaginated sub-resources:** ESS payslips, ESS leave-requests, `/leave/requests`, section lists (except attendance `take:30`)
- [ ] **High — bulk employee upsert** sequential per-row loop, no transaction (`employeeService.js:85-109`)
- [ ] **Medium — UserDashboard** fires `listEnrollments`/`listPrograms` for every role (403 noise, `UserDashboard.jsx:102-103`); attendance "today" uses UTC not Manila (:87); 7 duplicated skeleton blocks
- [ ] **Medium — Organization** Add/Edit modals duplicate markup + duplicate DOM ids; "OSSP Compliance" button no-op (:188); `childCount` dead (:169); catches drop server message; no re-fetch after mutation; local-state mutations bypass reload
- [ ] **Medium — ESS** month flip over-fetches profile/payslips/leave (:80-84); `formatCurrency` decimals inconsistent; `documentUrl` free-text
- [ ] **Medium — Employees** skeleton `colSpan={7}` on 11-col table (:190); no re-fetch after delete (:113); duplicates MasterTable
- [ ] **Medium — dead code:** `EmployeeProfileModal.jsx` (whole component), `bulkImportEmployees` (`api/employees.js:31`), `SECTION_NAMES` (`api/employeeSections.js:14`); contract drift — AGENTS claims `contracts/employeeSections.js` which doesn't exist (inline Zod)
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
