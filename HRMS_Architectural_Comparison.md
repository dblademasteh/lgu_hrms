# HRMS Architectural Comparative Analysis
## LGU Tailored Human Resource Management System
**Date:** 2026-09-08
**Scope:** Standard Design Pattern Approach vs Master-Detail Pattern

### Context - Philippine LGU Constraints
Philippine Local Government Units manage civil service populations with multi-level organizational hierarchies: LGU Central Office > Departments / Offices > Sections > Barangay units. Key data domains: Employee Profiles, Organizational Hierarchies, Payroll Records, Leave, Appointments, COA-compliant audit trail. Constraints: on-prem data residency, RBAC by office/department, sensitive PII and payroll data, growing permanent and contractual workforce, administrative staff with varied digital literacy.

## 1. Architectural Definitions

### 1.1 Standard Design Pattern Approach
Layered, domain-driven architecture (the Standard Design Pattern approach):
- Presentation Layer: React SPA, route-based pages
- API Layer: Express REST v1, Zod validation, JWT + RBAC middleware
- Data Layer: Prisma ORM, PostgreSQL 16, UUID PKs, UTC timestamps
- Cross-cutting: Audit Trail, Ledger Pattern, RBAC, Notification

Patterns applied: Controller → Service → Repository, Audit Trail append-only, RBAC scope enforcement at API, immutable ledger for payroll movements.

### 1.2 Master-Detail Pattern Approach
UI-centric pattern where a master list is always visible and a detail pane/form edits the selected master row.
- Master: Employee table, Department tree, Payroll batch list
- Detail: Inline form / side panel with profile, employment history, payroll breakdown
- State: Client holds selected master ID, detail loads on selection
- Navigation: Minimized routing, persistent master list

Often implemented with single-page master-detail views for Employees, Organizational Units, Payroll Runs.

## 2. Comparative Evaluation

### 2.1 Scalability for Growing Civil Service Populations

**Standard Design Pattern**
Pros:
- Pagination, filtering, server-side search at API level. `?page=1&limit=50` convention scales to 10k+ employees.
- Database indexing on `employeeNumber`, `departmentId`, `status`, `hiredDate`.
- Layered services allow horizontal scaling of API and read replicas for reporting.
- Prisma migrations support partitioning payroll tables by fiscal year/period.

Cons:
- More page loads for navigation. Requires careful prefetching for related entities.

**Master-Detail**
Pros:
- Fast context switching for admin staff reviewing many records sequentially; no full page reload.
- Ideal for small to medium lists <500 items.

Cons:
- Master list rendering large datasets in browser causes memory and DOM pressure. Civil service growth in LGUs can reach thousands of employees + historical records.
- Detail pane loads related data synchronously; multi-level hierarchy traversal can cause N+1 queries without optimization.
- Difficult to implement server-side pagination while keeping master list persistent.

Verdict: Standard Design Pattern scales better for long-term growth. Master-Detail requires virtualized tables and aggressive lazy-loading to remain viable.

### 2.2 Data Integrity for Sensitive Government Records

**Standard Design Pattern**
Pros:
- Transactional service layer ensures atomic updates across Employee, Payroll, Leave.
- Audit middleware logs every mutation with before/after JSON, userId, IP, timestamp - append-only `AuditLog`.
- RBAC enforced server-side per route, department scope checks prevent cross-office access.
- Ledger Pattern for payroll: every pay, deduction, adjustment creates immutable `LedgerEntry` with running balance, truth derived from ledger.
- Validation via Zod at API boundary prevents malformed PII.

Cons:
- Complexity requires disciplined service design.

**Master-Detail**
Pros:
- Inline editing reduces context switching, reduces risk of editing wrong record.

Cons:
- Optimistic UI updates can cause lost updates when multiple admins edit same employee.
- Partial saves from detail pane may bypass cross-entity validation.
- Harder to enforce comprehensive audit trail per field change; often only final state is logged.
- Risk of exposing entire master dataset to client for filtering, increasing PII exposure surface.

Verdict: Standard Design Pattern provides stronger integrity guarantees required by COA and CSC regulations. Master-Detail can be adapted but needs explicit transaction boundaries and server-side audit hooks.

### 2.3 User Interface Efficiency for Administrative Staff

**Standard Design Pattern**
Pros:
- Clear separation of workflows: Employee Profile page, Payroll page, Organizational Chart page. Matches administrative mental models.
- Dedicated forms with validation feedback, printable COA reports.
- Accessible tables with sticky headers, keyboard navigation, WCAG AA target.

Cons:
- More clicks to navigate between related entities.
- New users may require training on navigation.

**Master-Detail**
Pros:
- High efficiency for bulk review tasks: scan master list, click to view/edit details in side panel.
- Reduced cognitive load for simple CRUD: Employee list → details for appraisal, leave balance.
- Suitable for Warehouse/Property-type tasks already used in LGU IMS.

Cons:
- Complex multi-level hierarchies overwhelm single master list. Organizational hierarchy requires tree view + detail, leading to nested master-detail which becomes confusing.
- Payroll records require multi-tab detail: basic pay, allowances, deductions, loans, statutory contributions. Detail pane becomes crowded.
- Print and compliance reporting less natural.

Verdict: Master-Detail wins for quick lookup and simple edits. Standard Design Pattern wins for complex workflows, compliance reporting, and multi-step approvals required in LGU HRMS.

## 3. Data Relationship Handling

### Employee Profiles + Multi-level Hierarchies + Payroll

Standard Design Pattern:
- Normalized schema: Employee → Department → Section → Barangay, with closure table or `parentId` for hierarchy.
- Service layer resolves hierarchy with recursive CTEs, returns flattened DTOs for UI.
- Payroll linked via `employeeId`, `payPeriodId` with foreign keys and cascade rules.

Master-Detail:
- Master list for Employees filters by selected Department in master master.
- Detail pane shows hierarchy breadcrumbs and inline hierarchy editor.
- Risk of denormalization for performance, leading to sync issues.

## 4. Recommendations for LGU HRMS

Hybrid approach recommended:
- Use Standard Design Pattern as architectural foundation for scalability, integrity, compliance.
- Apply Master-Detail pattern tactically within specific modules:
  * Employee Directory search and quick edit
  * Organizational Unit tree with inline move/rename
  * Leave request list with detail approval pane
- Maintain server-side pagination, virtualized tables, and audit hooks for all master-detail views.
- Keep payroll and appointment modules as dedicated route-based workflows with ledger audit.

This balances Philippine LGU need for COA auditability and data protection with administrative efficiency for daily operations.
