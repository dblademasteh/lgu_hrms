# Leave & Appointments — LGU HRMS

How leave filing/approval, credits, and CSC appointment records work across the
system: surfaces, status lifecycle, workday math, and the hardening pass
(verified live, Sep 2026).

## Surfaces

| Surface | Path | Auth |
| --- | --- | --- |
| Employee self-service leave | `GET/POST /ess/leave-requests` | linked employee (self-scoped) |
| ESS leave balances | `GET /ess/profile` → `employee.leaveCredits` | linked employee |
| HR approval console | `GET /leave/requests`, `POST /leave/requests`, `PATCH /leave/requests/:id` | `leaveApproval` (dept scope for DEPARTMENT_HEAD) |
| Credits (approver) | `GET /leave/credits?employeeId=`, `POST /leave/credits/reconcile` | `leaveApproval` |
| Terminal-leave monetization | `POST /leave/requests/:id/monetize` | `leaveApproval` |
| Appointments | `GET|POST /appointments`, `PATCH|DELETE /appointments/:id` | `appointmentsRead` / `appointmentsCRUD` |

All frontend entry points are wired to the real API — no mocks.

## Leave model

**`LeaveRequest`** — `PENDING → RECOMMENDED → APPROVED/DENIED`, or direct
`PENDING → APPROVED`; `CANCELLED` allowed from PENDING/RECOMMENDED. Terminal
leave cannot change status except CANCELLED after approval. Approved terminal
requests can be monetized once (`monetized`/`monetizedAt`/`monetizedAmount`).
`days` is **recomputed server-side** from `fromDate→toDate` as working days
(Mon–Fri, `countWorkdays`) — client `days` is ignored; half-day = 0.5 × workdays.

**`LeaveCredit`** — `[tenantId, employeeId, type, year, balance]`. Advisory
VL/SL/SP/SW caps are rule-driven (`AttendanceRule`-style `LeaveRuleConfig`
`accrualPerMonth`/`maxCarryOver`). `reconcileCredits` runs on every credits
read/`reconcile`: seeds fixed annual balances for missing types **and** accrues
months for configured rules.

## Rules enforced in `leaveService.createRequest`

- `toDate < fromDate` → 400 `VALIDATION_ERROR`
- Non-approver filers are **self-locked** to their linked employee
  (`linkedEmployeeId`) — an attacker-supplied `employeeId` is ignored.
- Forced/terminal leave requires an approver (403).
- Overlapping PENDING/APPROVED request → 409 `CONFLICT` (unless terminal/forced).
- Vacation requires 5 working days advance notice (`ADVANCE_NOTICE_REQUIRED`).
- Sick leave > 3 days requires a medical certificate (`DOCUMENT_REQUIRED`).
- Type must exist in `LeaveType`; any balance shortfall → `INSUFFICIENT_CREDIT`
  (marked LWOP skips the balance check).

## Approve → decrement

`APPROVED` decrements `LeaveCredit.balance` by `existing.days` inside a
`$transaction` with the status update. `recommendedBy/approvedBy/deniedBy` +
`*At` + `decisionNote` are written on each transition. Status changes are
lifecycle-checked (`INVALID_TRANSITION` for illegal moves, e.g. APPROVED→PENDING).

## Appointment model

`Appointment` stores a **snapshot** of `name`/`position`/`dept` at create time
(from the linked Employee row) plus the CSC fields (`signedBy/issuedBy/
approvedBy/verifiedBy/documentUrl/oraohraReference/cscFormNo/remarks`).
`deletedAt` soft-delete (list/update/remove filter it). Status uses the CSC
enum `PENDING → APPROVED → VERIFIED → ISSUED → EFFECTIVE → ENDED / SEPARATED`
(the DB column is `AppointmentStatus`; **`ACTIVE` is not a valid value** — look
out for it in legacy forms/payloads). `itemNumber` maps to a `PlantillaItem`.

Tenant isolation on every query (`withTenant`) and write (`stampTenant`);
DEPARTMENT_HEAD leave reads are scoped to their department (repository layer).

## Hardening pass (Sep 2026) — all verified live

- **ESS read self-scope (Critical leak)** — `GET /ess/leave-requests` used to
  return the *whole tenant* list (`leaveService.listRequests`). Now resolves the
  linked employee and reads `leaveRepository.findRequestsByEmployee` (new).
  **Before**: an EMPLOYEE saw a co-worker's PENDING leave (names included).
  **After**: only their own requests.
- **ESS filing flag passthrough** — `POST /ess/leave-requests` was dropping
  `isHalfDay / isLwop / isTerminal / advanceNoticed / documentUrl` (Zod strip +
  handler destructured only 5 fields). Contract + handler now forward all flags.
  Half-day filing now stores 0.5 days.
- **Appointments create fixed (two bugs)** — (a) the form posted `start`/`end`
  while the API contract requires `startDate`/`endDate` → every create 400d;
  renamed in `Appointments.jsx`. (b) Contract/service/form defaulted status to
  `ACTIVE`, which is **not** in the DB `AppointmentStatus` enum → every create
  500d `INTERNAL_ERROR`. Aligned contract (`PENDING` default), service default,
  and the form's status dropdown (PENDING/APPROVED/VERIFIED/ISSUED/EFFECTIVE/ENDED).
- **Leave modal employee picker** — the "Employee ID" field asked for the
  employee *number* (`EMP-DEFAULT-0001`) but the API resolves a UUID → 404. Now
  a real employee `<select>` (from `listEmployees`) that submits the UUID.
- **Dead code removed** — `leaveRepository.upsertLeaveCredit` (broken
  composite-id `where`, unreferenced).

## Follow-ups (tracked in TODOS.md)

- No pagination on `/leave/requests`, `/ess/leave-requests`, `/appointments`
  (full tenant dumps today; 1k-scale needs `page`/`limit` like payroll).
- APPROVED decrements the credit without re-checking the *current* balance
  (shortfall could push it negative only if balance changed between filing and
  approval — add a guard).
- `reconcileCredits` uses raw `create` on reads (no unique on
  `[tenantId, employeeId, type, year]`) — concurrent reads can duplicate rows;
  prefer an idempotent upsert + unique index.
- ESS "Leave Balance" math counts *requests* (including PENDING), not *days* —
  cosmetic; power it from `LeaveCredit` + approved consumption.
- NDA/statutory tables (CSC leave monetization forms) still on the app roadmap.