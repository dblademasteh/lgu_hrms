# PRIME-HRM Gap Integration

**Benchmark:** CSC Program to Institutionalize Meritocracy and Excellence in Human Resource Management (PRIME-HRM). Four core HR systems and maturity levels Transactional → Process-Defined → Integrated → Strategic.

## PRIME-HRM Core Systems

### 1. Recruitment, Selection and Placement (RSP)
**PRIME-HRM pillars:**
- Governance, Talent Planning, Talent Sourcing, Talent Selection and Placement
- 201 File maintenance, appointment issuance, plantilla management, eligibility tracking

**Current LGU-HRMS:**
- Employee master data: ✅ full PII schema, CRUD UI scaffolded, seed data present
- Appointments module: ✅ schema model `Appointment`, backend routes/controllers/services/repo wired, frontend `Appointments.jsx` API wired
- Organizational structure: ✅ department hierarchy with code/name/parentId/level, CRUD via API
- Plantilla item numbers tracked in Appointment.itemNumber

**Gaps:**
- Recruitment/applicant tracking workflow: ❌ no applicant model, job posting, screening
- Eligibility tracking linked to appointment: ❌
- Vacancy management / automated requisition: ❌
- Document verification workflow for 201 file: 🟡 UI exists, no file storage integration

**Action:** Add `Applicant`, `Vacancy`, `Eligibility` models. Extend `Appointment` with CSC appointment type validation and plantilla linkage enforcement.

### 2. Learning and Development (L&D)
**PRIME-HRM pillars:**
- Governance, Planning & Monitoring & Evaluation, Execution
- Training needs analysis, IDP, learning records, competency mapping

**Current LGU-HRMS:**
- No L&D module in schema, backend, or frontend

**Gaps:**
- TrainingRequest, TrainingProgram, TrainingAttendance models: ❌
- Competency framework: ❌
- Individual Development Plan tracking: ❌
- Training budget and utilization reporting: ❌

**Action:** P3 priority. Add schema models `TrainingProgram`, `TrainingModule`, `TrainingAttendance`, `Competency`. Frontend page `Training.jsx` with catalog, enrollment, completion certificates.

### 3. Performance Management
**PRIME-HRM pillars:**
- Governance, Performance Planning & Commitment, Performance Monitoring, Performance Evaluation, Rewards
- IPCR/OPCR/SPMS, DTR/attendance integration, KPI tracking

**Current LGU-HRMS:**
- Attendance/DTR: ✅ schema `Attendance`, backend routes wired, frontend `Attendance.jsx` API wired
- Payroll run status DRAFT→APPROVED→POSTED: ✅ schema and backend wired
- Audit trail: ✅ `AuditLog` model, backend routes wired, frontend viewer wired
- Leave management: ✅ `LeaveRequest`, `LeaveCredit` wired

**Gaps:**
- IPCR/OPCR appraisal forms: ❌ no `PerformanceReview` model
- Performance rating workflow with department head approval: ❌
- Performance linked to rewards/recognition: ❌
- Attendance analytics, tardiness/undertime auto-deduction: 🟡 Attendance exists, no rules engine

**Action:** Add `PerformanceReview`, `PerformanceRating`, `KPI` models. Wire Attendance hours to payroll deductions via service.

### 4. Rewards and Recognition
**PRIME-HRM pillars:**
- Incentives, rewards, recognition programs, compensation management
- Salary grade/step, allowances, 13th month, bonuses, statutory contributions

**Current LGU-HRMS:**
- Payroll engine scaffold: ✅ `PayrollPeriod`, `PayrollRun`, `PayrollItem`, `LedgerEntry`
- Statutory deductions single field: 🟡 `PayrollItem.deductions` Decimal, needs line-item breakdown
- Appointment type affects benefits: ✅ appointment type stored
- Leave credits and balances: ✅

**Gaps:**
- GSIS/SSS/PhilHealth/Pag-IBIG/BIR line items: ❌ need `PayrollDeductionLine` model
- 13th month / Cash Gift / Year-End Bonus: ❌
- Loans and salary advances: ❌
- Rewards & recognition module: ❌
- Salary step increment rules per DBM circular: 🟡 `Position.salaryGrade` exists, step not enforced

**Action:** Extend payroll schema with `Payslip` and `PayrollDeductionLine` for COA auditability. Add `Bonus`, `Loan` models. Build configurable rule tables for contributions and tax.

## Maturity Mapping

**Current maturity:** Process-Defined emerging
- SOPs documented in code, mock data replaced with API for Employees, Leave, Appointments, Departments, Attendance, Payroll, Users, Audit
- Audit middleware exists but partially wired
- Server-side pagination not yet enforced
- No L&D or Performance appraisal

**Path to Integrated:**
1. Add missing models: LeaveRequest/LeaveCredit already done, PerformanceReview, TrainingProgram, PayrollDeductionLine
2. Wire audit middleware on every mutation
3. Server-side pagination + virtualized tables
4. Configurable rule tables for leave, contributions, tax
5. Reports pipeline pdfmake/ExcelJS

**Path to Strategic:**
1. Data-driven dashboards with HR metrics
2. ESS portal self-service
3. HR analytics and predictive workforce planning
4. Integration with biometric devices and Land Bank disbursement

## Updated Roadmap Priority

P0 Foundation: Auth, RBAC, API wiring – done in progress
P1 Core PRIME-HRM alignment:
- RSP: complete Appointment workflow, add Eligibility
- Performance: add IPCR/OPCR model and workflow
- Rewards: split deductions to line items, 13th month
P2 Compliance: audit hooks, reports, PWA
P3 Benchmark parity: L&D module, Recruitment ATS, ESS

Recorded per AGENTS.MD §11.
