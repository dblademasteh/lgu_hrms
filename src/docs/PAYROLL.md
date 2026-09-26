# Payroll — Deep Dive (Sep 2026)

> **Sep 2026 update — payroll delegated to lgu-payroll.** HRMS no longer computes payroll. `payrollEngine.js` and every local write path (`/payroll/runs POST|approve|generate|post`, `/periods POST|close`, `/payroll-deduction` writes, `/rules` contributions+tax-brackets) are **deleted or refuse with 409** `PAYROLL_MANAGED_BY_LGU_PAYROLL` (`backend/src/middleware/payrollAuthority.js`). HRMS is now a **read-only mirror**: `POST /payroll/sync-from-payroll` pulls period/run/record changes from the tenant's lgu-payroll instance and upserts them by `externalId` (`source: LGU_PAYROLL`), lgu-payroll pushes lifecycle events to `POST /integrations/payroll/webhook`, and `GET /integrations/loans` (`loans:read`) exposes amortization schedules so lgu-payroll can deduct. See the "Delegation status" section below for how this reshuffles the findings, and `src/docs/PAYROLL_INTEGRATION.md` for the wire protocol.

> Hardening pass over the **Payroll & Benefits** group: Payroll runs, periods, payslips, deduction lines, and the payroll-summary report.
> Benchmark: CSC Memo Circulars (MC No. 8 s. 2014 divisor, MC No. 41 s. 1998 tardiness, DBM-CSC JC No. 2 s. 2015 overtime), BIR TRAIN withholding (2023), GSIS/Pag-IBIG/PhilHealth contribution rules, COA Payroll Register/Journal/Certificate of Compensation, PRIME-HRM.
> Verify gates: `node --check`, `npm run build`, color lint.

## Delegation status (Sep 2026)

What the delegation did to the findings and plan above:

| Item | Status |
|---|---|
| Engine + write paths (`createPeriod/closePeriod/createRun/approveRun/generateRun/postRun`, `computeRun`, dead controller handlers) | **Deleted** — not dormant; blocked routes answer 409 |
| #1 rules leak (unscoped writes feeding payroll math) | Moot for payroll math — the engine is gone and contribution/tax-bracket writes are 409. Rules **reads** stay staff-wide (reference only); leave-rule config still drives accrual and was never payroll math |
| #2 `LoanAmortization` never created | **Fixed** — `POST /loans` now generates the schedule (equal installments, last absorbs rounding remainder in Decimal, month-end clamped) and `LoanAmortization.loan` is `onDelete: Cascade`; loan `type` mirrors the Prisma `LoanType` enum (a contract drift made every creation 400) |
| #6 manual deduction lines | Blocked — the endpoints appended lines without reconciling totals; mirrored lines come from lgu-payroll instead |
| #7 ESS exposes DRAFT payslips | **Fixed** — `/ess/payslips` filters `run.status: 'POSTED'` |
| #8 AuditLog bulk cap dead code | **Fixed** — `MAX_AUDIT_BODY_BYTES`/`summarizeObject` are reachable and cap `AuditLog.after` |
| #11 `contracts/loans.js` money/type | **Fixed** — `type` mirrors `LoanType` |
| #12 `postRun` over-marking amortizations | Engine deleted; the adapter's `_settleAmortizations` marks only run employees' unpaid rows due within the period, on POSTED transition |
| #3 payslip print 401 | **Fixed** — `frontend/src/lib/print.js` fetch-blob (token attached by the axios client) |
| #4 seed rules / #5 AttendanceRule route | Moot for the engine; `AttendanceRule` still drives attendance lateness/remarks |
| #13 runs-list pagination | Superseded — the page is read-only; large tenants page through the API (`page/limit/summary`) |
| BIR/GSIS/PhilHealth/Pag-IBIG/13th-month modeling | Lives in **lgu-payroll's** deduction catalogue now — HRMS's `ContributionRule`/`TaxBracket` are reference-only and their writes are 409 |

## Scope (surfaces)

| Page | Route | Backend | Roles |
|---|---|---|---|
| Payroll | `/payroll` | `/payroll/*`, `/payroll-deduction/*` | `payrollRead` (reads) / `payrollRuns` (writes) |
| Reports | `/reports` | `/reports/payroll-summary` | ADMIN, HR_MANAGER, PAYROLL_OFFICER, AUDITOR |
| Self-Service | `/ess` | `/ess/payslips`, `/ess/payslips/:id/print` | EMPLOYEE + HR roles |
| Dashboard | `/dashboard` | client payroll widget (runs + summary) | all (in-page gated) |
| Employee record | `/employees` | `/employees/:id/sections/payroll` | employeeRecordsCRUD |

## What is already wired (verified)

- **No mocks.** Full run lifecycle is wired: Create Period → Create Run (wizard) → GenerateItems → Approve → Post → View → Payslip modal → Print URL. Every button calls a real endpoint (agent trace, Payroll.jsx).
- **Decimal-only math in the engine.** `computeRun` uses `new Prisma.Decimal(...)` for every contribution/tax/LWOP/OT/net computation (`payrollEngine.js`), `round2 = toDecimalPlaces(2)`; rows persist via `createManyAndReturn` (no per-row loops). Scale posture ≥1k rows holds.
- **Tenant scoping inside payroll is clean.** `payrollRepository`, `payrollEngine`, `payrollDeductionRepository`, `reportsController`, `overtimeRepository` all use `withTenant`/`stampTenant`.
- Composite indexes for hot reads exist (in migration `20260913103813_add_role_and_permission_tables`).
- Engine rules are **data-driven** (`ContributionRule`, `TaxBracket`, `AttendanceRule`) — no hardcoded SSS/PH/Pag-IBIG/BIR tables.
- CSC-correct pieces already present: divisor 22 with actual-workdays pivot when unpaid>10 (MC 8 s.2014); tardiness → VL charge (MC 41 s.1998); OT pay 1.25/1.5 × 176h-hr rate (JC 2 s.2015); ledger append-only; apportionment of LWOP/gap vs paid leave.

## Critical findings

1. **Tenant leak — `/rules/*` feeds payroll math unscoped.** `rulesController.js:2-7` passes `{}` as where (all tenants' rules readable by anyone); `rulesRepository.js:3/5/7` creates without `stampTenant` → contribution/tax/leave rules land with `tenantId = NULL`. The engine filters rules by `tenantId` (`payrollEngine.js:23-25`), so **admin-created rules are invisible to `generate`** while reads leak across tenants. This is the single most consequential payroll bug. (`rules.js` also has **no Zod on any POST** — arbitrary garbage rows.)
2. **Cash-side of payroll is dead:** `LoanAmortization` rows are never created (no disbursement/approval route; `POST /loans` creates only the `Loan`); `allowances` is always ZERO (`payrollEngine.js:319`); there is no 13th-month or tax-breakdown column on `PayrollItem`; `Bonus` rows (incl. THIRTEENTH_MONTH) never enter a run. The COA Certificate of Compensation cannot be produced.
3. **Payslip print is functionally broken — 401.** `frontend` opens `window.open('/api/v1/payroll/payslips/:id/print')`; `requireAuth` (`auth.js:4-6`) reads **only** the `Authorization: Bearer` header. A top-level navigation sends no header/localStorage token/cookie → the HTML tab always 401s. Same for ESS print.

## High findings

4. **No seed rules.** `seed.js` creates no `ContributionRule`, `TaxBracket`, or `AttendanceRule` → out-of-the-box `generate` emits **zero** contribution and tax lines, uses the hardcoded 08:00 schedule with `tardinessMin=0`.
5. **No route to administer `AttendanceRule`.** The engine and `attendanceService` read it, but no API/UI creates one; `AttendanceRule.deductionRate` (`schema.prisma:1139`) is **never read anywhere** (dead field).
6. **Manual deduction lines don't reconcile totals.** `POST /payroll-deduction/items/:itemId/lines` writes lines but never recomputes `PayrollItem.deductions/netPay` → ledger + payroll-summary + paid-employee totals disagree with the payslip. Frontend has **no deduction editor** (`addLines`/`upsertPayslip` in `api/payrollDeduction.js` are dead exports).
7. **ESS exposes DRAFT-run payslips.** `/ess/payslips` + print filter only by employee/tenant, never `run.status` — employees see generated-but-unposted figures.
8. **AuditLog bulk cap is dead code.** `audit.js:86` `return rest;` makes lines 88-90 (`MAX_AUDIT_BODY_BYTES`, `summarizeObject`) unreachable → generate/post responses (every item + line) are written to AuditLog in full, contradicting AGENTS.md "capped at 64KB". `getRun` reload + `{count}` shape never fires.
9. **Withholding tax under-withholds.** `tax = (taxable − min) × rate` (`payrollEngine.js:306`) has **no base-tax** component, no dependents/exemptions, no annualization. BIR TRAIN uses `base + excess×rate`; `TaxBracket` has no `baseTax` column.
10. **Contribution model is linear-only.** `share = basic × rate` (`payrollEngine.js:219-220`) with no caps/floors by type; GSIS (9%/12%+14% contingency), Pag-IBIG fixed-tier with salary cap, and PhilHealth 2024 (5%-cap monthly premium, 50/50 share, floors/ceilings) cannot be modeled. `ContributionRule` lacks cap/floor/ceiling fields.
11. **Validation gaps upstream of the engine:** `POST /rules/*` unvalidated; `contracts/payrollDeduction.js:8-9` money as `z.number()`; `contracts/loans.js:22` `z.coerce.number()`; `overtimeService.js:104-108` computes pay in JS floats (`Number(monthlySalary)`, `Math.round(x*100)/100`). These are the code paths whose output feeds Decimal columns.
12. **`generatedAt` never set** on regenerate (`payrollRepository.regenerateRun`), and **`postRun` marks ALL period-due tenant amortizations paid**, including for employees with no item in the run (`payrollService.js:111-118`).
13. **Frontend scale gap:** runs list has no pagination (backend default page 1/limit 20) → runs after the first 20 unreachable; "Total Runs" stat uses server `total` and can disagree with the visible table. Periods list is also unpaginated.

## Medium findings (frontend / hygiene)

14. **Reports "Standard Reports" are stubs.** 4 hardcoded catalogue entries (`data/reports.js`) with "Generate" = toast only; **pdfmake/ExcelJS are not installed** yet `Reports.jsx:56` claims them; header says "3 templates" but the array has 4. Payroll-summary tile itself is real and CSV export works (client-side single summary row).
15. **New-run row display bug:** after `createRun`, the prepended row comes from bare `prisma.payrollRun.create` (no `period`/`items` include) → empty period name + ₱0.00 until reload (`Payroll.jsx:102`).
16. **Eight divergent money printers**: `peso()` duplicated in Payroll/Reports/UserDashboard/DetailPane/EmployeeProfileModal + ESS `formatCurrency` (variable decimals) + inline in Employees/notifications. No shared `format.js`.
17. **Payslip modal refetches deduction lines** already included in `/runs/:id` detail (`Payroll.jsx:68`).
18. **Dead code:** `EmployeeProfileModal.jsx` (full duplicate of `DetailPane`, never imported); `api/payrollDeduction.js` `addLines`/`upsertPayslip` have no UI.
19. **AGENTS.md drift:** cites migration `20260913160000_payroll_scale_indexes` — does not exist; indexes live in `20260913103813_add_role_and_permission_tables`.

## Benchmark — CSC / BIR / COA / PRIME-HRM best practice for payroll

- **COA Certificate of Compensation (COA Circular 2012-001 / CSC MC 11 s.2009):** must show base (basic/allowances), bonuses, gross, total deductions (contributions, loans, tax, LWOP/ATTD), net pay. Current payslip HTML shows lines but **no allowances, no 13th-month, no running-net**, and item money columns don't include line-level reconciliation.
- **BIR TRAIN withholding (RR 8-2018, updated 2023):** marginal base-tax + excess-rate brackets, employee dependents for exemption. Current model needs `TaxBracket.baseTax` + dependents-aware net-taxable + annualization across runs.
- **GSIS (RA 8291):** member 9%, employer 12% (basic + RATA for incumbents) + 14% contingency; GSIS is for career permanent staff — **temporary/coterminous use SSS** instead. Needs per-scheme logic, not a single linear rule.
- **PhilHealth (2024, RA 11223):** 5% of monthly basic capped at ₱10,000 premium base (max ₱500/mo), 50/50 employer-employee split. Needs premium cap by salary, not linear.
- **Pag-IBIG (PD 1752, revised 2021):** employee 1%-2% on up to ₱5,000... with employer 2%; practically employee 100/200 fixed below/above ₱1,500 cap tiers. Needs fixed-tier schedule.
- **13th Month (PD 851 → RA 12116 in 2025):** 1/12 of basic salary usually paid ≤ Dec 24; RA 12116 **removed the ₱90k tax-exemption cap effective 2025**. `Bonus` table has the type but no computation/landing in runs.
- **CSC MC No. 8 s. 2014 (divisor 22, actual-workdays pivot)** and **MC No. 41 s. 1998 (tardiness = VL charge, excess = unpaid)** are correctly implemented — good.
- **PRIME-HRM:** payslip self-service, payroll register journaling, and report generation (COA Payroll Register + Journal) are expected outputs; current app prints HTML payslips only and has no COA register/journal.

## Hardening plan

### P1 (do now — correctness/security)
- [ ] `rules.js` + controller + repository: `validate()` on all POSTs, `withTenant` reads, `stampTenant` writes (fixes the cross-tenant leak AND makes rules visible to the engine); add Zod contracts (`contracts/rules.js` with rate/min/max as string-preserving Decimal-safe numbers).
- [ ] **Payslip print auth:** one-time signed URL (`?token=` short-lived JWT) or server-side passthrough for `window.open`; fix both `/payroll/payslips/:id/print` and `/ess/payslips/:id/print`. (Or switch frontend to fetch-blob print.)
- [ ] **ESS: exclude non-POSTED runs** (`run.status` filter) on `/ess/payslips` + print.
- [ ] Restore AuditLog bulk cap: move `MAX_AUDIT_BODY_BYTES`/`summarizeObject` before the `return rest;` in `audit.js` (generation/posting now compacted to `{count}`).
- [ ] `generatedAt` set on regenerate; `postRun` amortization over-marking scoped to run employees.

### P2
- [ ] **Seed contribution/tax/attendance rules** (GSIS/SSS split, PhilHealth 2024 5%-capped schedule, Pag-IBIG tiers, BIR TRAIN 2023 brackets) per tenant + `AttendanceRule` CRUD route/UI (unlocks `deductionRate`).
- [ ] **Deduction editor UI** wiring `POST /payroll-deduction/items/:id/lines` + `upsertPayslip`; reconcile `PayrollItem.deductions/netPay` recompute server-side on line write.
- [ ] **Loan lifecycle**: approve/disburse routes, amortization schedule generation (termMonths), so the LOAN-* deduction path is real not dead.
- [ ] Run/period pagination in Payroll frontend (`page/limit/summary` already supported) + reconcile Total Runs stat.

### P3
- [ ] `TaxBracket.baseTax` + dependents + annualized withholding; contribution model gains cap/floor/ceiling fields; GSIS vs SSS scheme selection.
- [ ] `PayrollItem.allowances` real input + 13th-month auto-computation (RA 12116) landing in a run; COA Certificate of Compensation + Payroll Register + Journal report generation (install pdfmake/ExcelJS or server-side).
- [ ] Money formatter consolidation (single `format.js`). `overtimeService` and money contracts to Decimal-safe handling (string-preserving `z.coerce` or Decimal parse).

## Money / dates / audit

- Money already Decimal in-engine; the leak is upstream (rules contracts, overtime estimates, manual line inputs).
- Dates YYYY-MM-DD + UTC, displayed Asia/Manila (`lib/time.js`); CSV/attendance filenames use UTC `toISOString().slice(0,10)` — align.
- Audit: global mount writes every mutating payroll request exactly once; restore the 64KB cap so generate/post don't bloat `AuditLog.after`.