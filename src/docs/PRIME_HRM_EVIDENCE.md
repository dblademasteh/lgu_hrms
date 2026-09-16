# PRIME-HRM Evidence Pack

> **For:** HRM Office / HRMO lead preparing the CSC PRIME-HRM self-assessment, Accredited/Bronze/Silver/Gold dossier, and MTR/FTR compliance checklists.
> **Source of truth for module reality:** read from the live schemas (`backend/prisma/schema.prisma`), routes (`backend/src/routes/index.js`), and pages (`frontend/src/App.jsx`, `components/Sidebar.jsx`). Deep dives: `src/docs/PAYROLL.md`, `REPORTS.md`, `WORKFORCE.md`, `ESS.md`, `LEAVE_APPOINTMENTS.md`.
> **PRIME-HRM framework:** 4 core HRM systems × 4 maturity levels (Transactional → Process-Defined → Integrated → Strategic); assessed through **ERs (Evidence Requirements)** served from the agency's HR records, policies, and HRIS. Authority: CSC MC No. 1 s. 2021 (Revised PRIME-HRM Guidelines) + 2025 resolution on MTR/FTR.

## Status legend

| Mark | Meaning |
|---|---|
| 🟢 **Ready** | The HRMS produces/extracts this evidence today (page + endpoint verified) |
| 🟡 **Partial** | Data recorded but no exportable artifact / workflow incomplete / UI gap |
| 🔴 **Gap** | No capability — item listed in the gap-to-roadmap mapping |

Every 🟢 row includes the **menu path** the HRMO officer uses to generate the artifact, plus the backing model/endpoint.

---

## System 1 — Recruitment, Selection & Placement (RSP)

Schema: `Applicant`, `Vacancy`, `VacancyPublication`, `Interview`, `Eligibility`, `Appointment`, `PlantillaItem`, `DesignationOrder`, `Disqualification`. Routes: `/recruitment` (funnel: Applicants / Interviews / Vacancies tabs), `/vacancy`, `/interviews` (redirect into funnel), `/appointments`, `/plantilla`, `/designation`, `/disqualifications`.

### Pillar A — Governance
| ER (evidence requirement) | Digital artifact | Feature / endpoint | Status | How to generate |
|---|---|---|---|---|
| MSB constituted per CSC MC 21 s.2015 | MSB/Agency Selection Board; HRD committee | — | 🔴 | No document store / committee registry. Needs office-order capture (see Docs Store gap) |
| 201 Files / employee records | 201 tabs (Personal, Family, Education, Eligibility, Awards) | `/employees` + `/employees/:id/sections/*` (`Employee`, `Eligibility`) | 🟢 | HRMO: Employees → open record → 201 panels |
| Records custodianship & audit | Append-only trail on every HR action | `AuditLog` + `/audit` page (global `auditLog` mount) | 🟢 | HRMO/Auditor: Compliance & Audit → Audit Trail; filter by employee/action |

### Pillar B — Talent Planning
| ER | Digital artifact | Feature / endpoint | Status | How to generate |
|---|---|---|---|---|
| Approved staffing pattern | Department + position catalogue | `/departments`, `/positions` (`Department`, `Position`) | 🟢 | Workforce → Organization |
| Plantilla (item numbers, status, incumbent) | Plantilla register | `/plantilla` (`PlantillaItem`, `itemNumber`) | 🟢 | RSP → Plantilla (create wired; modal submit button added) |
| Job descriptions / qualification standards | Position metadata | `/positions` | 🟡 | Position record exists (`salaryGrade`, `title`); formal JDF/QS document export missing |
| Succession / competency inventory | Competency catalogue | `/performance/competencies` (`Competency`) | 🟡 | Performance & L&D → Performance → Competencies (has CRUD); no succession-plan view |

### Pillar C — Talent Sourcing
| ER | Digital artifact | Feature / endpoint | Status | How to generate |
|---|---|---|---|---|
| Vacancy posting & publication trail | Vacancy + publication history (date posted) | `/recruitment` → Vacancies tab (`Vacancy`, create/list/close wired) | 🟢 | RSP → Recruitment → Vacancies tab; vacancy publication wired |
| Transparency of posting | Public/published record of vacancies | `VacancyPublication` | 🟡 | Postings are logged; public job-seeker portal not yet exposed (publish = admin action + audit trail) |
| Application intake | Applicant register w/ status | `/recruitment` (`Applicant`: APPLIED→…→HIRED, `resumeUrl`) | 🟢 | RSP → Recruitment |
| Eligibility & DIBAR vetting | Eligibility records (CSC/PRC/BAR) + DIBAR active-list + CSV | `Eligibility` (201); `/recruitment` pre-hire score + post-hire eligibility block + `/disqualifications` (`Disqualification`) | 🟢 | Eligibility enum corrected; eligibility surfaced in funnel pane + 201; DIBAR active-list + CSV export verified |
| RSP online/deregulated automation | HRIS as the posting/screening system | RSP module (above) | 🟡 | Ready data-wise; on-site validation of the publication flow |

### Pillar D — Talent Selection & Placement
| ER | Digital artifact | Feature / endpoint | Status | How to generate |
|---|---|---|---|---|
| MSB screening records | Screening score + board notes per applicant | `/recruitment` (Applicant detail pane: scores + selectionBoardNotes) | 🟢 | RSP → Recruitment → applicant detail pane |
| Interview schedule & results | Interview records (date, status, notes) | `/recruitment` → Interviews tab (`Interview` CRUD + status transitions) | 🟢 | RSP → Recruitment → Interviews (schedule, complete, cancel, delete, applicant picker) |
| Hiring decision → placement | Hired-employee linkage | `/recruitment` → Applicants tab → Hire modal (`Employee` + `Appointment` + optional plantilla fill) | 🟢 | RSP → Recruitment → Hire (idempotent; salary prefill from plantilla authorizedSalary) |
| Appointment issuance (CSC Form 33) | Appointment records (item no., effectivity, type) | `/appointments` (`Appointment`) | 🟢 | RSP → Appointments (create OK; **no Form-33 printer/`oraohraReference` capture**) |
| Designation / temporary designation | Designation orders | `/designation` (`DesignationOrder` CRUD, DRAFT→RECOMMENDED→APPROVED→ISSUED→EFFECTIVE→REVOKED) | 🟢 | RSP → Designation (employee picker, status lifecycle, ConfirmDialog-backed Remove, Effective/Pending summary) |
| Compliance of appointments (2025 Omnibus Rules) | Appointment → plantilla item + position validation | `/appointments` + `/plantilla` | 🟡 | No plantilla enforcement on appoint; `itemNo` free string not FK; PATCH broken (`itemNo` never mapped) |

---

## System 2 — Learning & Development (L&D)

Schema: `TrainingProgram`, `TrainingEnrollment`, `Competency`, `PerformanceCompetency`, `IDP`. Routes: `/training`, `/performance/competencies`. Page: `/learning`.

### Pillar A — Governance
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| L&D policy / HRDC constitution | Office orders | — | 🔴 | Needs Docs Store (§Governance gap) |
| Computer-based L&D records | Training module screen | `/learning` (`TrainingProgram`) | 🟢 | Performance & L&D → Learning (Admin/HR_MANAGER, `trainingCRUD`) |

### Pillar B — Planning & Monitoring/Evaluation
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| TNA/LNA (needs assessment) | Needs-assessment instrument/results | — | 🔴 | No LNA tool or survey |
| Annual L&D plan + budget utilization | Plan document | — | 🔴 | No planning artifact |
| IDPs (from Performance Management) | Individual Development Plan per employee | `IDP` (employeeId, year, goals JSON) | 🟡 | Model + seed exist; verify `/learning` IDP editor |
| Level-1/Level-2 evaluation | Training feedback/assessments | — | 🔴 | No evaluation capture |
| L&D efficiency review (1 intervention/employee/yr) | Per-employee training history report | `TrainingEnrollment` → employee section `training` | 🟡 | Data complete; no L&D utilization report/export yet |

### Pillar C — Execution
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| Training catalogue & schedule | Training programs | `/learning` (`TrainingProgram`) | 🟢 | Performance & L&D → Learning |
| Enrollment & attendance records | Enrollments per employee/offering | `/training/*`, employee tab `training` | 🟢 | Employee record → training section; Learning → enroll |
| Competency-based development | Competency framework + per-review matrix | `/performance/competencies` (`Competency`, `PerformanceCompetency`) | 🟢 | Performance → Competencies; IPCR page competency matrix |

---

## System 3 — Performance Management (PM)

Schema: `PerformanceReview`, `PerformanceTarget`. Pages: `/performance`, `/ipcr`, `/attendance`. Routes: `/performance`, `/attendance`.

### Pillar A — Governance
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| SPMS/DTR policy & linkage | SPMS form 1-style targets; DTR data | `/performance`, `/ipcr`, `/attendance` (SPMS weights Core 50/Strategic 30/Support 20; competency 30) | 🟢 | Performance & L&D → Performance / IPCR; Attendance → DTR |
| Attendance/DTR reliability | Punch records (kiosk, portal, biometric) | `/attendance`, kiosk app, `/biometric-devices` | 🟢 | Verified in `ATTENDANCE.md`/`DEVICES.md` |

### Pillar B — Performance Planning & Commitment
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| Individual targets (IPCR) w/ KRAs & weights | `PerformanceReview` + `PerformanceTarget` (KRA, successIndicator, outputGroup, weight) | `/ipcr`, `/performance` | 🟢 | Performance → IPCR; quarterly `q1–q4 actual` fields |
| Office targets (OPCR) | Parent-review cascade (`parentReviewId` → childReviews) | `/performance` | 🟡 | Cascade modeled + OPCR create in Help; workflow depth to verify |
| Commitment approval | Planning status flow | `ReviewStatus` PLANNING→…→APPROVED | 🟡 | Statuses exist; sign-off/notification steps to verify |

### Pillar C — Monitoring & Coaching
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| Quarterly monitoring of targets | Q1–Q4 actuals + % attainment | `PerformanceTarget.q1Actual…annualActual`, `actualPercent` | 🟢 | IPCR/Performance → target rows |
| Attendance/behavior performance input | Tardiness → VL charge (CSC MC 41 s.1998), LWOP proration | `AttendanceRule` + `payrollEngine` | 🟢 | Proven by payroll engine (`PAYROLL.md`) |

### Pillar D — Review & Evaluation
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| Rating + adjectival result | `rating`, `adjectivalRating`, `officeRatingCap` | `/performance` | 🟢 | Performance → review record |
| Approval cascade | `reviewedBy/reviewedAt`, `approvedBy/approvedAt` | `/performance` | 🟢 | Statuses + audit trail |

### Pillar E — Development Planning
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| IDP from performance results | Per-employee IDPs | `IDP`, `/performance` link | 🟡 | Model exists; end-to-end UI to verify |

---

## System 4 — Rewards & Recognition (R&R)

Schema: `PayrollPeriod/Run/Item/DeductionLine`, `Payslip`, `LedgerEntry`, `ContributionRule`, `TaxBracket`, `Bonus`, `Loan`/`LoanAmortization`, `OvertimeRequest`. Pages: `/payroll`, `/reports`, `/ess` (+ dashboard widgets for bonus/loans). Routes: `/payroll*`, `/payroll-deduction`, `/rules`, `/bonus`, `/loans`, `/overtime`.

### Pillar A — Governance
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| R&R program/policy (COA-cleared incentives) | Policy documents | — | 🔴 | Docs Store gap |
| Compensation/benefits rules authority | Contribution + tax rules config | `/rules/contributions`, `/rules/tax-brackets`, `/rules/leave-rules` | 🟢 | Tenant-scoped + validated after P1 (`contracts/rules.js`); engine consumes them |

### Pillar B — Planning
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| Salary structure (grade/step) | `Position.salaryGrade` | `/positions` | 🟡 | Grade stored; step-increment rules (DBM Circular) not enforced |
| Allowances (RATA/PERA/sub) feed comp | Allowance input into payroll | `PayrollItem.allowances` — always ZERO in engine | 🔴 | Fix in PAYROLL.md P3 (allowances input + 13th-month) |
| Leave benefits & monetization | Leave credits/rules; monetized days | `/leave`, `LeaveRuleConfig`, `LeaveRequest.monetizedDays` | 🟢 | Leave module verified (`LEAVE_APPOINTMENTS.md`) |

### Pillar C — Execution (compensation & benefits realization)
| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| Payroll computation (Decimal, rule-driven) | Period → run → generate → approve → post | `/payroll` lifecycle (engine in `payrollEngine.js`) | 🟢 | Payroll page; gov IDs on `Employee` (GSIS/PhilHealth/Pag-IBIG/TIN) |
| Statutory deduction lines | `PayrollDeductionLine` codes (CON-*, TAX, LWOP, OT-PAY) | `/payroll/runs/:id` detail, payslip modal | 🟢 | Present per item |
| Payslips (self-service + COA content) | HTML payslip (auth-fixed print), ESS copy (POSTED-only) | `/payroll/payslips/:id/print`, `/ess/payslips` | 🟢 | Print via `lib/print.js`; ESS hides DRAFT runs |
| Contribution model fidelity | GSIS 9%/12%, PhilHealth 5%-cap, Pag-IBIG tiers | `ContributionRule` (linear only) | 🟡 | Needs cap/floor fields — PAYROLL.md P3 |
| Withholding tax accuracy | BIR TRAIN brackets | `TaxBracket` (baseTax missing) | 🟡 | Under-withholds without base/dependents — PAYROLL.md P3 |
| 13th month / bonuses (PD 851 → RA 12116) | `Bonus` (THIRTEENTH_MONTH/CASH_GIFT/YEAR_END_BONUS) | `/bonus` API + dashboard widgets | 🟡 | Data captured; no auto-computation or landing in runs |
| Loans / salary advances | `Loan` + `LoanAmortization` | `/loans` API + dashboard widgets | 🟡 | No approve/disburse; amortizations never generated |
| Remittances (GSIS/Pag-IBIG/PhilHealth/BIR 1601-C) | Line-code grouped remittance report | `PayrollDeductionLine.code` | 🔴 | REPORTS.md P2 (line-code endpoint) |
| COA Payroll Register / Journal / COA payslip cert | Register/journal artifacts | `reports` | 🔴 | REPORTS.md P2/P3 (server-side engine + renderers) |
| Overtime pay (DBM-CSC JC 2 s.2015) | `OvertimeRequest` + OT-PAY credit on generate | `/overtime` (+ payroll engine) | 🟢 | Approved OT folds into payroll |

---

## Cross-cutting — Evidence every pillar needs

| ER | Digital artifact | Feature / endpoint | Status | Notes |
|---|---|---|---|---|
| HRIS in use (computer-based systems proof) | Screens per module; audit trail | all modules | 🟢 | Screencap-friendly; tenant-scoped |
| HR records integrity & age-proof trail | Append-only `AuditLog`, before/after snapshots, failed-login events | `/audit` | 🟢 | Strong compliance story for MTR/FTR |
| RBAC / segregation of duties | Roles + `RolePermission` matrix, capability-gated routes | `/users` (matrix UI), backend `requirePermission` | 🟢 | Admin → Users & Roles |
| Employee self-service (transparency) | ESS profile/payslips/leave/attendance | `/ess` | 🟢 | Boosts RSP/PM/R&R transparency indicators |
| Records retention / soft deletes | `deletedAt` on Employee; history tables | schema | 🟢 | Workforce deep-dive verified |
| Policy/office-order document store | Store OOs, resolutions, MOAs as evidence | — | 🔴 | **Biggest cross-cutting gap** — see roadmap |

---

## Self-assessment read (maturity by system)

> Read = what the HRMS currently **proves**; the HRM Office still supplies policies/orgs (docs).

| System | Maturing read | Evidence-backed rationale | Fastest way up |
|---|---|---|---|
| **RSP** | ML2 (Process-Defined) → trending ML3 | Full vacancy→applicant→interview→appointment→plantilla chain, audit trail | Public posting portal; CSC Form 33 print; MSB deliberation artifact |
| **L&D** | ML1 (Transaction records only) | Catalogue + enrollment + competencies real; no LNA/plan/evaluation | Docs store + LNA/training plan/report cycle (`/learning` deep-dive) |
| **PM** | ML2-3 | SPMS target model, quarterly actuals, rating/approval cascade, DTR integration | OPCR workflow depth; form-1/sign-off print |
| **R&R** | ML1-2 | Decimal payroll, deduction lines, OT, leave, ESS payslips | Allowances + 13th month + remittance & COA reports (PAYROLL/REPORTS P2/P3) |

---

## Gap → Roadmap (feeds TODOS.md)

**Cross-cutting (blocks every pillar):**
1. **Docs Store** — office orders, resolutions, MOAs, policies as versioned tenant documents (evidence artifacts for MSB, HRDC, L&D plan, R&R program). No doc model exists today (`Employee.resumeUrl`/`Payslip.pdfUrl` are the only URL slots).
2. **Form printers** — CSC Form 33 (appointment), SPMS Form 1, Service Record (CSC 212), COA payslip cert. HTML-print contract exists (DESIGN.md §10) but only payslip HTML is built.

**RSP:** public posting portal; MSB deliberation minutes capture; eligibility-vs-vacancy validation at hire.
**L&D:** `/learning` deep-dive → LNA instrument, annual L&D plan + utilization report by `TrainingEnrollment`, level-1/2 evaluation capture, IDP editor end-to-end.
**PM:** OPCR→IPCR cascade depth + sign-off notifications; SPMS form print.
**R&R (from PAYROLL.md & REPORTS.md):** `PayrollItem.allowances` input + 13th-month (RA 12116); contribution cap/floor model + `TaxBracket.baseTax` (dependents); loan approve/disburse → amortizations; **remittance + COA Register/Journal server-side reports**; shared export + report renderers (pdfmake/ExcelJS).

---

## How to run this pack

1. **Populate:** log in as HR_MANAGER/ADMIN, open each 🟢 row's menu path, run the action, export/print the artifact, file under the ER.
2. **Refresh:** this pack was generated from live schema/routes/pages (Sep 2026); re-verify after every deep-dive batch (each deep dive updates its `src/docs/*.md`).
3. **MTR/FTR:** CSC RO requests updated ERs (Recruitment Plan, L&D Plan, Office Orders, Minutes) + appointments data for the last 2 years — the app can answer **appointment counts/status and the audit trail** today, and the reports engine (REPORTS.md P2) will answer remittance/register queries.
4. **Audit hygiene:** every mutating action already writes `AuditLog` exactly once; export `/audit` filtered per system as supporting proof of "age-proof records".

