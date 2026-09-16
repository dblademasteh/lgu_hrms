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
- Employees page: server-side search/filter/pagination (debounced), soft delete (`deletedAt`), CSV export, `EmployeeForm` (CSC 201 tabs: Personal/Family/Education/Work Exp/Eligibility/Awards), detail via `Modal` + `DetailPane` (9 read-only relation tabs).
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