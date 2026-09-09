# LGU-HRMS Todos

## High Priority
- [ ] (none - all complete; see Medium Priority)

## Medium Priority
- [ ] Build IPCR/OPCR approval workflow with notifications
- [ ] Attendance rules engine auto-deductions to payroll
- [ ] Competency framework & IDP tracking UI
- [ ] Applicant workflow: screening, interview scheduling, offer letter generation
- [ ] Reports: PDF payslip via pdfmake, Excel export via ExcelJS

## Low Priority
- [ ] Employee Self-Service leave filing and payslip download enhancements
- [ ] Loans amortization schedule UI
- [ ] Bulk import employees from CSV
- [ ] Role-based dashboard widgets per user role

## Done
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
