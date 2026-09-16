# HRMS Benchmark — LGU HRMS vs PRIME-HRM & CSC Standards

> **Benchmark date:** 2026-09-16
> **Frameworks:** CSC PRIME-HRM (MC No. 3 s.2012, revised MC No. 1 s.2021), 2025 Omnibus Rules on Appointments, CSC MC 21 s.2015 (MSB), ORA-OhRA circulars, PCSMP target specs
> **Comparators:** PRIME-HRM maturity levels; CSC digital HRMS requirements; on-prem government deployment constraints

---

## Executive Summary

| Framework | LGU HRMS current fit | Gap to next maturity |
|---|---|---|
| **RSP (Recruitment, Selection & Placement)** | ML2 → ML3 | Public vacancy portal, MSB minutes artifact, Form 33 print, appointment-plantilla enforcement |
| **L&D (Learning & Development)** | ML1 → ML2 | LNA/TNA, annual plan, evaluation capture, L&D utilization report |
| **PM (Performance Management)** | ML2 → ML3 | OPCR cascade sign-off, SPMS Form 1 print, KPI analytics |
| **R&R (Rewards & Recognition)** | ML1 → ML2 | Line-item deductions, 13th month/bonus rules, loans module, recognition program |

**Overall read:** The system is at **Process-Defined (ML2)** with **Integrated (ML3)** reach on RSP and PM data models. Reporting and compliance export are the weakest surfaces for accreditation.

---

## 1. Benchmark Matrix

### 1.1 Recruitment, Selection & Placement

| Evidence Requirement | PRIME-HRM / CSC standard | LGU HRMS status | Artifact / endpoint |
|---|---|---|---|
| Staffing pattern / plantilla | Approved plantilla register with item numbers, status, incumbent | 🟢 Ready | `/plantilla` (`PlantillaItem`) |
| 201 File maintenance | Personal, Family, Education, Eligibility, Awards tabs | 🟢 Ready | `/employees/:id/sections/*` |
| Vacancy posting & publication | Public notice + publication history | 🟡 Partial | `Vacancy` + `VacancyPublication`; admin-logged only, no public portal |
| Applicant intake & tracking | APPLIED → screened → hired/closed | 🟢 Ready | `/recruitment` funnel (`Applicant`) |
| Eligibility tracking | CSC/PRC/BAR eligibilities linked to employee | 🟢 Ready | `Eligibility` enum + `/employees` 201 panel |
| DIBAR / barred list | Active disqualifications + CSV export | 🟢 Ready | `/disqualifications`, `/disqualifications/active`, `/disqualifications/report` |
| MSB screening & interviews | Board notes, scores, interview records | 🟢 Ready | `/recruitment` Interviews tab (`Interview`) |
| Hire → employee + appointment | Idempotent hire creating Employee + Appointment | 🟢 Ready | Hire modal in Recruitment funnel |
| Appointment issuance (CSC Form 33) | Printed Form 33 with item no., effectivity, plantilla validation | 🟡 Partial | `Appointment` CRUD; **no Form 33 print**, no plantilla FK enforcement |
| Designation orders | Temporary/permanent designation with lifecycle | 🟢 Ready | `/designation` (`DesignationOrder`) DRAFT→EFFECTIVE→REVOKED |
| Audit / COA trail | Append-only log of all HR transactions | 🟢 Ready | `AuditLog` + `/audit` |

### 1.2 Learning & Development

| Evidence Requirement | PRIME-HRM / CSC standard | LGU HRMS status | Artifact / endpoint |
|---|---|---|---|
| L&D policy / HRDC constitution | Office order / policy document | 🔴 Gap | — |
| Training catalogue & schedule | Programs, dates, target participants | 🟢 Ready | `/learning` (`TrainingProgram`) |
| TNA / LNA | Needs assessment instrument + results | 🔴 Gap | — |
| Annual L&D plan + budget | Plan document + utilization | 🔴 Gap | — |
| Enrollment & attendance | Per-employee training records | 🟢 Ready | `TrainingEnrollment` + employee section |
| IDP | Individual Development Plan per employee | 🟡 Partial | `IDP` model exists; `/learning` editor not verified end-to-end |
| Competency framework | Competency catalogue + per-review mapping | 🟢 Ready | `/performance/competencies` (`Competency`, `PerformanceCompetency`) |
| Level-1 / Level-2 evaluation | Feedback/assessment capture | 🔴 Gap | — |
| L&D efficiency report | 1 intervention/employee/yr report | 🟡 Partial | Data exists; no utilization export |

### 1.3 Performance Management

| Evidence Requirement | PRIME-HRM / CSC standard | LGU HRMS status | Artifact / endpoint |
|---|---|---|---|
| SPMS / IPCR targets | KRA, success indicators, weights, actuals | 🟢 Ready | `/ipcr`, `/performance` (`PerformanceReview`, `PerformanceTarget`) |
| OPCR cascade | Department → division → individual targets | 🟡 Partial | `parentReviewId` modeled; workflow depth unverified |
| Attendance / DTR | Punch records, tardiness, undertime, LWOP | 🟢 Ready | `/attendance`, kiosk, biometric devices |
| Attendance rules engine | Lateness/undertime auto-deduction | 🟡 Partial | `AttendanceRule` scaffolded; no active route or seed data |
| Performance evaluation workflow | Self, peer, supervisor ratings + sign-off | 🟢 Ready | `/performance` ratings + approval flow |
| SPMS Form 1 print | Printable target sheet | 🔴 Gap | — |

### 1.4 Rewards & Recognition

| Evidence Requirement | PRIME-HRM / CSC standard | LGU HRMS status | Artifact / endpoint |
|---|---|---|---|
| Payroll / 13th month / bonuses | Computation + payout records | 🟡 Partial | `Bonus` scaffolded; no 13th month/bonus engine |
| Statutory contributions | GSIS, SSS, PhilHealth, Pag-IBIG, BIR line items | 🟡 Partial | Single `PayrollItem.deductions` field; no line-item breakdown |
| Loans / salary advances | Application + amortization | 🟢 Ready | `/loans` (`Loan`, `LoanAmortization`) |
| Recognition program | Awards, incentives, citations | 🟡 Partial | `Award` scaffolded; no rewards workflow |
| Salary step / increment | DBM circular step rules | 🔴 Gap | `Position.salaryGrade` exists; step not enforced |

---

## 2. Compliance Check: CSC Circulars & Memos

| Standard | Requirement | LGU HRMS fit |
|---|---|---|
| **CSC MC 21 s.2015** (MSB) | Constituted board, screening, interview, minutes | 🟡 Data exists (`selectionBoardNotes`, `Interview`); **no minutes/office-order capture** |
| **2025 Omnibus Rules on Appointments** | Appointment types, plantilla validation, effectivity rules | 🟡 `Appointment` schema aligned; **no Form 33 print**, plantilla FK not enforced |
| **ORA-OhRA** | DIBAR, evidence document, CSC Form No. capture | 🟡 `Disqualification` + `evidenceDocument`; **no upload UI**, reference fields unused |
| **CSC MC 3 s.2012 / MC 1 s.2021** (PRIME-HRM) | 4-system assessment, evidence pack | 🟢 Evidence register drafted (`PRIME_HRM_EVIDENCE.md`); some artifacts still missing |
| **PCSMP (2025–2029)** | Digital HRM, payroll modernization, analytics | 🟡 Core HRMS digital; **no payroll PDF/Excel renderer**, limited analytics |

---

## 3. Technical / On-Prem Constraints

| Constraint | LGU HRMS compliance |
|---|---|
| **No Google Fonts CDN** | 🔴 Violation: `frontend/src/index.css` still uses `@import` for Google Fonts |
| **Self-hosted fonts only** | 🔴 Not yet implemented; fontsource not adopted |
| **CORS allowlist (no `*`)** | 🟢 Implemented in `server.js` |
| **Rate limiting** | 🟢 `authLimiter` + `apiLimiter` in-memory; Redis required for multi-instance |
| **Structured logging / Sentry** | 🟡 Optional DSN envs; no default SaaS leak |
| **Health endpoint** | 🟢 `GET /api/v1/health` |
| **Tenant isolation** | 🟢 `withTenant` + `stampTenant` + JWT `tenantId` |
| **Soft delete** | 🟡 Mixed: `Attendance` soft, others hard |
| **Audit trail** | 🟢 Global `auditLog` middleware; append-only `AuditLog` |

---

## 4. Gap-to-Roadmap Mapping

| Gap | Target maturity | Effort | Notes |
|---|---|---|---|
| Public vacancy portal (`VacancyPublication` exposure) | RSP ML3 | Medium | Needs public route + tenant context |
| MSB minutes / office-order capture | RSP ML3 | Medium | Docs Store model needed |
| CSC Form 33 print + `oraohraReference` capture | RSP ML3 | Medium | Reuse `openHtmlInNewTab` transport |
| Appointment → plantilla enforcement | RSP ML3 | High | `Appointment.itemNumber` → FK to `PlantillaItem` |
| TNA/LNA + annual L&D plan | L&D ML2 | Medium | Survey/model + plan artifact |
| L&D utilization report | L&D ML2 | Low | Aggregate `TrainingEnrollment` by employee/yr |
| IDP editor end-to-end | L&D ML2 | Medium | `/learning` IDP tab wiring |
| OPCR cascade sign-off workflow | PM ML3 | High | Notification + approval chain |
| SPMS Form 1 print | PM ML3 | Low | HTML→PDF transport |
| Line-item payroll deductions (GSIS/SSS/PhilHealth/Pag-IBIG/BIR) | R&R ML2 | High | `PayrollDeductionLine` model + engine |
| 13th month / Cash Gift / Year-End Bonus | R&R ML2 | Medium | Rules engine + bonus computation |
| Salary step increment enforcement | R&R ML2 | Medium | DBM step table + auto-apply |
| Google Fonts removal → fontsource | Technical | Low | `npm install` fontsource packages |

---

## 5. Verdict

**LGU HRMS** is a credible **Process-Defined (ML2)** HRIS with strong RSP and PM data models, full audit trail, and multi-tenant on-prem architecture. It is **not yet PRIME-HRM Integrated (ML3)** because of missing export artifacts, public vacancy portal, and incomplete L&D/R&R workflows.

Against **PCSMP** targets, the system is directionally correct but lacks the **reporting layer** (PDF/Excel renderers, COA formats) and **analytics** needed for evidence-based policy.

**Next upgrade step:** Close the Reporting + Print + Docs Store gaps to reach ML3, then add L&D evaluation + R&R line-item deductions for ML4 readiness.
