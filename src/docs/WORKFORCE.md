# Workforce — Deep Dive (Sep 2026)

> Hardening pass over the **Workforce** sidebar group: Dashboard, Employees, Organization, Employee Self-Service.
> Benchmark: CSC 201 File / PRIME-HRM RSP + Performance governance. Verify gates before shipping: `node --check`, `npm run build`, color lint.

## Scope (surfaces)

| Page | Route | Backend | Roles |
|---|---|---|---|
| Dashboard | `/dashboard` | client-computed stats + section APIs | all authenticated |
| Employees | `/employees` | `/employees` CRUD + `/employees/:id/sections/*` | ADMIN, HR_MANAGER, DEPARTMENT_HEAD (SUPER_ADMIN) |
| Organization | `/organization` | `/departments` CRUD | ADMIN, HR_MANAGER, DEPARTMENT_HEAD (SUPER_ADMIN) |
| Self-Service | `/ess` | `/ess/*` (profile/payslips/leave/attendance) | EMPLOYEE + HR roles (SUPER_ADMIN excluded) |

## What is already wired (verified)

- **No mocks.** All four pages call real APIs; `mock.js` is limited to the allowed `badgeTone()` static.
- Employees page: **server-side search/filter/pagination** (debounced 300ms search; dept filter from `departmentsApi`; stats + pagination from server counts — see the reanalysis section below), soft delete (`deletedAt`), CSV export (selection-aware + paged export-all), `EmployeeForm` (CSC 201 tabs: Personal/Family/Education/Work Exp/Eligibility/Awards), detail via `Modal` + `DetailPane` (9 read-only relation tabs).
- Organization: department tree CRUD (`parentId`/`level`), unit types, LGU-category flags, Mandatory/HRM Office/Sanggunian toggles.
- ESS: profile, payslips + print, leave requests + filing (server-side business rules), attendance month view.
- Global middleware order `requireAuth → tenantContext → auditLog` covers all 11 Workforce mutating endpoints exactly once (4 employees + 3 sections + 3 departments + 1 ESS leave). No double-audit.
- DEPARTMENT_HEAD department-scoping enforced on employees (`departmentScope.js` `assertDepartmentAccess`) — list/get/create/patch/delete.
- ESS is self-service only: identity resolved from `User.externalId` → `Employee.employeeNumber`, tenant-scoped on every hop; `days` recomputed server-side (client value not trusted).

## Critical findings

1. **Tenant isolation violation — `/employees/:id/sections/*`** (`backend/src/services/employeeSectionService.js`).
   The whole section subsystem (13 related models: eligibilities, family, education, awards, history, appointments, leave, leaveCredits, attendance, payroll, performance, training, loans) runs **unscoped**:
   - `assertEmployee` is a cross-tenant existence oracle (`employeeSectionService.js:109`).
   - `list`/`update`/`remove` query by `employeeId`/`id` only — no `withTenant` (lines 129-184).
   - `create` writes without `stampTenant` → new sub-records get `tenantId = NULL`, invisible to every tenant-scoped repo while this service keeps reading them unscoped (lines 153-155).
   - The global `auditLog` before-snapshot path inherits the same unscoped reads (`audit.js:28-32`).
   Contradicts AGENTS.md tenant policy ("withTenant scope and stampTenant on writes" on every business table).

## High findings

2. **Unvalidated inputs → 500.** `GET /employees` query read raw (`employeeController.js:5-7`; bad `page/limit/status` → Prisma validation 500); section `POST/PATCH` bodies unvalidated (only params; non-`P2xxx` Prisma errors → 500); `GET /ess/payslips/:itemId/print` param unvalidated (`ess.js:98`).
3. **Global unique keys as tenancy design.** `Employee.employeeNumber`, `Department.code`, `User.username` are globally unique → cross-tenant collision is `P2002` → generic 500 (no per-tenant 409). Same for FK violations (`P2003` → 500).
4. **Employees list cap mismatch.** Frontend requests `limit:500` (`Employees.jsx:55`) but controller caps at 200 → stats, dept filter, CSV export silently operate on the first 200 rows; `total` from the API is ignored. No backend headcount/stats endpoint exists anywhere.
5. **Department `level` never maintained.** Only tenant seeding writes `level`; user-created units keep default `0` regardless of hierarchy (`departmentsRepository.js`, `Organization.jsx:258`). No soft delete for departments — hard `delete` → `P2003` 500 when referenced. No `GET /:id`, no cycle check on `parentId`, no headcount endpoint.
6. **Unpaginated sub-resources.** ESS payslips, ESS leave-requests, `/leave/requests` (whole-tenant dump to approvers), and section lists (except attendance `take:30`).
7. **Bulk employee upsert** is a sequential per-row create/update loop, no transaction (`employeeService.js:85-109`) — 1000 rows = 1000 round-trips; per-row errors captured, no rollback.
8. **Date coercion drift.** `createDepartmentSchema` accepts `YYYY-MM-DD` for `concurrenceDate`/`cscSubmissionDate` but no service coerces to `Date` (employee + sections paths do).

## Medium findings (frontend)

9. **UserDashboard** fires `listEnrollments`/`listPrograms` unconditionally for every role (lines 102-103) → 403 to sections never displayed for roles without `trainingCRUD`; attendance "today" uses UTC date not Asia/Manila (line 87). Seven duplicated skeleton blocks.
10. **Organization** Add/Edit modals near-duplicate markup with duplicate DOM `id`s; "OSSP Compliance" button is a no-op `onClick={()=>{}}`; `childCount` dead; mutation `catch`es drop the server message (generic toast); no re-fetch after mutation.
11. **ESS** month flip re-fetches profile/payslips/leave (over-fetch); `formatCurrency` decimals inconsistent with `peso()` elsewhere; `documentUrl` free-text (no validation).
12. **Employees** loading skeleton `colSpan={7}` on an 11-column table; no re-fetch after delete (optimistic only); duplicates `MasterTable`.
13. **Dead code:** `EmployeeProfileModal.jsx` (whole component — Employees uses `Modal`+`DetailPane`), `bulkImportEmployees` (`api/employees.js:31`), `SECTION_NAMES` (`api/employeeSections.js:14`).
14. **Contract drift:** AGENTS.md lists `backend/src/shared/contracts/employeeSections.js`; only inline route Zod exists (file absent).

## Employees page reanalysis (Sep 2026 — 1k-employee scan)

Re-scanned `Employees.jsx` + `EmployeeForm.jsx` + `DetailPane.jsx` after seeding 1,000 employees per tenant. Backend verified solid; the frontend list layer is the problem.

### Verified live (P1 — FIXED Sep 2026, verified against 1k employees)

- [x] **200-row ceiling — fixed (server-side list).** The page now passes `search`/`departmentId`/`status`/`page` to `listEmployees` (all validated by `listEmployeesSchema`, DEPARTMENT_HEAD dept-scope enforced backend-side); stats cards read server counts (two `limit:1` count queries: total + ACTIVE; inactive = total−active); pagination driven by the response `total`; search debounced 300ms; the dept filter lists ALL departments from `departmentsApi` (UUID values — was built from page-1 rows only). Backend search OR-clause extended with `position: { title: { contains } }` so position search keeps working server-side. **Verified live**: `page=2&limit=20` → 20 items/total=1000; `search=Accountant` → 129; `search=HRMO` → 95; `status=ACTIVE` → 900; export-all loop (200/page × 5) reaches all 1,000.

- [x] **Reads-vs-docs drift — closed.** The "server-side search/filters/pagination" claim in this doc and the TODOS Done item is now true again; the drift note above records the regression window.

### Verified minor issues (FIXED unless noted)

- [x] **Duplicate email column** — Email column dropped; the Name-cell sub-line is the single email surface.
- [x] **Stale selection after delete** — `remove()` now drops the removed id from the `selection` Set and decrements the headcount cards (count/export stay honest); export toolbar button added (`Download` icon), selection-aware, with a paged export-all loop (backend caps `limit` at 200).
- [x] **Dead API exports** — `getEmployee` + `bulkImportEmployees` removed from `api/employees.js` (user chose removal over wiring a CSV import UI; can revisit as a feature later).
- [x] **EmployeeForm silent catches** — departments/positions loads toast on failure (was `catch(() => {})` — silent empty pickers broke create/edit).
- [x] **Skeleton `colSpan`** — fixed to 10 (matches the table after the Email column removal).
- [ ] **DetailPane print prints the whole page:** `window.print()` (`DetailPane.jsx:240`) includes the table behind the pane. The `buildIPCRFHtml` + `openHtmlString` pattern in `lib/print.js` is the house transport for a proper 201/Service Record print. (Deferred — full-sweep scope.)
- [ ] **DetailPane attendance tab unpaginated:** one employee now carries ~250 attendance rows rendered in a single table (related to the general unpaginated sub-resources finding; per-employee volume is manageable but should cap/paginate). (Deferred — full-sweep scope.)

### Working well (verified — no action)

- `monthlySalary` edit is safe: contract uses `z.coerce.number()` so the Decimal→string over JSON coerces.
- `Modal` unmounts children when closed (`return null`) → `EmployeeForm` `useState(initial)` re-initializes on every open (no stale-form bug between edit targets).
- All three filters reset `page` to 1 on change (no stale-page bug).
- Selection: per-row checkboxes, select-all across `filtered`, selection-aware CSV export.
- Status filter options match `EmployeeForm` STATUSES and the DB enum exactly.
- CSV export quotes/escapes correctly; loading skeleton present (though `colSpan={7}` vs 11 columns — known item).
- Backend `findEmployees` supports search (insensitive), `status`, `departmentId` + DEPARTMENT_HEAD dept-scope, `keyPosition`, skip/take pagination, `{items,total,page,limit}` response.

## Benchmark — CSC / PRIME-HRM best practice for Workforce

- **201 File** (CSC MC 9 s.1991): master record per employee — Personal, Family, Education, Work Exp, Eligibility, Awards, Appointments. Current schema+UI covers all; gaps: **file attachments** (birth cert, diploma, CSC elig), **Service Record** print view, employment **history end-date** governance.
- **Eligibility as qualification gate** (CSC): IRRs require valid CSC eligibility at appointment — current app does not **validate eligibility against the vacancy requirements** before hire (RSP module will).
- **Department/OSSP**: OSSP oversight requires org unit metadata (resolution, concurrence date, mandate). Current "OSSP Compliance" button is non-functional; `level`/headcount feeds should be computed server-side.
- **ESS (RA 6713 / s4 feedback)**: employees own their DTR/payslip/leave visibility. Current is read + file-leave only; recommend **leave balance from `LeaveCredit` (not request-count)**, upload for `documentUrl`, and payslip **download/PDF** (print HTML exists).
- **Dashboard maturity** (PRIME-HRM Strategic): replace client-derived 200-row stats with a **server `/workforce/stats` aggregate** (headcount by dept/status, hires, attrition, overdue reviews, leave loads) as a real endpoint — data-quality driver, not cosmetic.

## Hardening plan

### P1 (done Sep 2026 — verified live)
- [x] **Fix tenant isolation in `employeeSectionService`** — threaded `req`/tenant through list/create/update/remove + `assertEmployee`; `withTenant` reads, `stampTenant` writes, controller + `audit.js` pass `req`. **Verified**: family create stamps `tenantId`, section reads 200.
- [x] **Validate all inputs** — `listEmployeesSchema` (page/limit/search/departmentId/status) on `GET /employees`; new `contracts/employeeSections.js` (param + flat record-body schemas) on section `POST/PATCH`; ESS payslip print param. **Verified**: `limit=5000` → 400, bogus section → 400.
- [x] **Map Prisma `P2002`/`P2003` → 409/400 AppErrors** — `server.js` `normalizePrismaError` + refined `prismaError` in the section service. **Verified**: duplicate `employeeNumber` → 409 `DUPLICATE`.

### Employee Account hardening (done Sep 2026)
- [x] **ESS payslips 500 fixed** — `ess.js:38` referenced an undeclared `employeeId` (ReferenceError every load); now uses `employee.id`. **Verified** `node --check` + build.
- [x] **First-login password change enforced** — `usersService.create` stamps `passwordChangedAt: null` so `authService.passwordAge` reports expired → Login routes to Account → Security (30-day policy unchanged).
- [x] **Deactivation no longer corrupts the employee link** — `accountService.deactivateAccount` only sets `INACTIVE` (was overwriting `externalId='DEACTIVATED'`); reactivation via `/users` restores ESS without re-linking.
- [x] **`assertLinkable` tenant-scoped** — employee lookup + duplicate-link clash check now `withTenant(req, …)` on both `create` and `update` (was cross-tenant oracle).
- [x] **Only key-position employees can be linked** — new `Employee.keyPosition` tag (migration `20260917033551_add_employee_key_position`); `assertLinkable` rejects untagged employees (400 `NOT_KEY_POSITION`), `GET /employees?keyPosition=true` + Users dropdown list only tagged, 201 form Key Position field, seed tags `EMP-{tenant}-0001` as `HRMO`. **Verified live**: filter returns only tagged; untagged link → 400 `NOT_KEY_POSITION`.

### P2
- [ ] Departments: compute `level` on create/update, soft-delete (`deletedAt`), `GET /:id`, parent cycle check, employee headcount, blocked-delete with dependents (409 not 500).
- [ ] Server-side pagination on ESS payslips/leave-requests, `/leave/requests`, and section lists.
- [ ] `/workforce/stats` aggregate endpoint + Dashboard consumes it (kills the 200-row stats lie).
- [ ] Bulk upsert → `createMany`/transaction + dedupe.
- [ ] Bulk import Employees (pickup `bulkImportEmployees`) + delete dead code found.

### P3
- [ ] 201 File attachments + Service Record print; eligibility-vs-vacancy validation hook at hire.
- [ ] ESS: `LeaveCredit`-based balances, `documentUrl` upload, payslip PDF; Organization add/edit modal dedupe; Dashboard `trainingCRUD`-gate + Manila date.
- [ ] Employee list `colSpan` fix, re-fetch after delete, adopt `MasterTable`.

## Indexes / money / dates

- Money: Decimal only (payroll — not touched here).
- Dates: broker `YYYY-MM-DD`, coerce to UTC in services (`employeeService.coerceDates`), display Asia/Manila (`lib/time.js`). Departments path needs the same coercion.
- Multi-tenancy: every Workforce read `withTenant`, every write `stampTenant` — after P1, no exception remains.