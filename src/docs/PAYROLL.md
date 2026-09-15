# Payroll — CSC / DBM Compliance Reference

Reference mapping between Philippine civil-service payroll rules (CSC + DBM) and the
LGU-HRMS payroll engine (`backend/src/services/payrollEngine.js`, `leaveService.monetize`).
Purpose: every formula the app implements should trace to a citable circular, and every
gap should be a tracked TODO — not silent convention.

## 1. Authoritative issuances

| Rule | What it governs | Payroll-relevant content |
| --- | --- | --- |
| **RA 11466 (SSL-5)** + **EO 64 s. 2024** + DBM **NBC 594/597/601** + LBC 160 | Salary schedule | Salary = SG/Step table (4 tranches FY2024–FY2027 for civilian; LGU personnel covered by Local Budget Circulars). App's salary **source of truth = `Employee.monthlySalary`** (Decimal 12,2), not an SG lookup (SalaryScale table still future). |
| **CSC MC No. 2 s. 2016** (amends MC 41 s. 1998 §24 / §40) + **DBM BC 2016-2** | Terminal leave + leave monetization | Constant factor **CF = 12 / (365 − (104 + 12)) = 0.0481927** (RA 9849 added Eid'ul Fitr/Adha → 12 legal holidays, 249 workdays/yr, 20.75 days/month-equiv). `TLB = S × D × CF`. |
| **CSC MC No. 8 s. 2014** (Res 1400454) | Leave without pay (LWOP) | `SALARY = (22 − LWOP days) / 22 × MONTHLY` (divisor 22). Continuous absence > **10 working days** → divisor = **actual working days** (per MC 41/14 §56). |
| **CSC MC No. 21 s. 1991** | Working hours | 40-hour week (8 h/day × 5 days), 08:00–17:00; overriding tardiness by staying late is **not allowed**. Defaults baked into `AttendanceRule.workStartMins/workEndMins`. |
| **CSC MC No. 41 s. 1998** (Rule XVI) §§32–34, 56, 63 | Absences, tardiness, undertime, AWOL | §34: **tardiness and undertime are deducted from vacation leave credits** (not cash). §32: absent on a day where work was suspended after start → absent. §63: 30 WD continuous AWOL → dropped from rolls; 3× sub-30-day absences in a semester → pattern → same. |
| **CSC-DBM JC No. 2 s. 2015** (re: MO 228, NBC 458) | Overtime services & pay | `HR = S / (22 days × 8 h)`. Workday OT = **125% HR**; rest day / holiday / special non-working day = **150% HR**. Min **2 hours**. Only employees who reported **on time** may render OT. |
| **Joint Circular CSC-DBM No. 1 s. 1991 / JC 2-97** | Leave monetization | Max **30 days/yr**, **once a year**, employee must retain ≥ **5 days VL** after monetization. (MC 16 s. 2002 amends §23: 50%+ of VSLC may be monetized for valid reasons.) |
| **BIR** regs | Withholding tax | Monthly compensation table; de minimis; `P90,000` 13th-month ceiling; year-end bonus = 1 month basic + ₱5,000 cash gift (Nov). Current engine = **simplified bracket** `(taxable − min)×rate` (no PH base-amount step) — tracked TODO. |
| **GSIS/SSS/PhilHealth/Pag-IBIG** | Contributions | Configurable via `ContributionRule` (rates stored as Decimal fractions). Contribution premium is monthly-salary based (typically NOT prorated for LWOP). |

## 2. What computeRun implements (traceability)

- **Basic pay** = `Employee.monthlySalary` (Decimal). No SG-table lookup.
- **LWOP proration** (CSC MC 8 s. 2014): unpaid days drawn from **approved** `LeaveRequest.isLwop` rows overlapping the period + attendance gaps (workdays with no attendance row and no approved paid leave, office-wide closures excluded). Emitted as an `LWOP-*` deduction line so the payslip reconciles full monthly → net. Divisor = **22** when `unpaidDays ≤ 10`, else **actual working days** in the period (per MC 41/14 §56).
- **Tardiness / undertime** (MC 41 s. 1998 §34): charged to **vacation leave** — engine computes VL-days from minutes late, debits `LeaveCredit VACATION` at **POST** time (single idempotent junction), excess over VL balance flows into the LWOP proration. The old flat-cash `AttendanceRule.deductionRate` line is removed.
- **Overtime** (JC 2 s. 2015): approved `OvertimeRequest`s with ≥ 2 h → `OT pay = hours × HR × 1.25 (workday)` or `× 1.5 (rest/holiday)` where `HR = monthlySalary / 176`. Entries for employees who were **late** on the OT date are skipped. Emitted as a negative deduction line (credit to net), posted as `PAY` ledger.
- **Statutory contributions** = `basic × employeeRate` (GSIS/PhilHealth/Pag-IBIG via `ContributionRule`). Employer share recorded on the line but not posted to ledger (tracked TODO).
- **Tax** = simplified bracket `(taxable − min)×rate` on `basic − contribution`.
- **Loans** = unpaid `LoanAmortization` due in the period → `LOAN-*` lines.

## 3. Leave monetization / terminal leave (CSC MC 2 s. 2016, DBM BC 2016-2)

Endpoint `POST /leave/requests/:id/monetize` (approver-gated, `leaveApproval`):

- Per-day monetary value = `Employee.monthlySalary × 0.0481927` (server-computed; the client no longer supplies a rate — the old `monetizedAmount` body field is removed).
- **Terminal** (separation): monetizes the remaining LeaveCredit balance (`S × D × CF`), no 30-day/retention caps.
- **Non-terminal**: `days = existing.days`, capped by — **once per calendar year** (any existing monetized request that year → 409), **≤ 30 days/yr** (sum of `monetizedDays` that year), and for **VACATION** the balance after monetization must retain ≥ 5 days VL.
- `monetizedDays` persisted on the request for yearly-cap accounting.

## 4. Known gaps / follow-ups (also in TODOS.md)

- [ ] CSC `SalaryScale` table + SG lookup instead of free-form `Employee.monthlySalary`; tranche-aware (EO 64 s. 2024, NBC 594).
- [ ] Full PH **holiday calendar** (proclamation-based + Eid from RA 9849) so LWOP/absence math is holiday-accurate (today office-wide closures are inferred from "nobody clocked in").
- [ ] Real BIR monthly withholding (base-amount step) instead of simplified bracket.
- [ ] `employerShare` contribution lines recorded in ledger (currently stored, not posted).
- [ ] 13th month / year-end bonus engine (models exist; `Bonus` not consumed by `computeRun`).
- [ ] Payroll-period proration for half-month / cut-off periods.
- [ ] Actual PDF payslip (engine currently renders printable HTML).

## 5. Ordering / integrity notes

- Engines use **Prisma Decimal** exclusively; `round2()` is the only rounding site.
- Deduction lines carry `quantity` (units: VL days for ATTD, OT hours) so POST can settle credits/ledger idempotently.
- POST is the only mutating junction for leave-credit debits (generate/regenerate stay read-only).
- All amounts are recomputed server-side from stored rates; never trust client-sent totals.