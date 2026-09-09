# LGU HRMS — Feature Gap Analysis
**Date:** 2026-09-09
**Benchmarked against:** `HRMS_Architectural_Comparison.md` (hybrid recommendations), `AGENTS.MD` (§10 roadmap), and standard HRMS module sets (BambooHR / Gusto / SAP SuccessFactors class + Philippine LGU/CSC conventions: plantilla, DTR, appointments, GSIS/PhilHealth/Pag-IBIG/BIR).

> **Status update 2026-09-09:** the Frontend column below predates the feature-integration pass. Now implemented against mock data: modal/confirm-dialog/toast/tabs components, collapsible sidebar, command palette, 404 + error boundary, Users & Roles admin + permissions matrix, Attendance/DTR page, Appointments page, employee CRUD + profile tabs + payslip UI, org tree CRUD, payroll run wizard + run detail + payslips, leave approval pane + credits, audit before/after viewer, PWA manifest. Remaining gaps = the API column plus items explicitly marked wire-later.

## 1. Current State Snapshot

**Frontend** — 8 routed pages (Login, Dashboard, Employees, Organization, Payroll, Leave, Audit, Reports), token-based design system (light/dark), component classes (`btn/input/card/stat/badge/data-table/sidebar-link`), central mock layer `src/data/mock.js`. Working client-side: employee search/filter/pagination, leave approve/deny, audit entity filter, theme toggle.

**Backend** — `server.js` health-check only (port 4000) + `middleware/auth.js` + `middleware/audit.js` (both currently unused). **No routes, controllers, services, seed, or `.env`.**

**Data model** — `schema.prisma` defines 10 models: User, Department (self-relation hierarchy), Position (SG/step), Employee (full PII), EmploymentHistory, PayrollPeriod, PayrollRun, PayrollItem, LedgerEntry, AuditLog. Enums: Role (ADMIN, HR_MANAGER, PAYROLL_OFFICER, DEPARTMENT_HEAD, AUDITOR), EmploymentStatus, PayrollStatus (DRAFT/APPROVED/POSTED), LedgerType.

**Frontend infra** — `src/api/` and `src/stores/` exist but are **empty** (docs prescribe Axios client with JWT interceptor + Zustand stores: auth, theme, UI). No router 404, no error boundary, no tests.

## 2. Feature Matrix

Legend: ✅ done · 🟡 partial · ❌ missing · — n/a

| # | Module / Feature | Docs | Schema | Backend API | Frontend UI | Gap |
|---|---|---|---|---|---|---|
| 1 | Login + JWT auth + session | ✅ | ✅ | ❌ | 🟡 mock only | Real auth flow; forgot password |
| 2 | RBAC role-gated nav + guards | ✅ | ✅ (5 roles) | ❌ | ❌ | Role from JWT → gate sidebar/routes |
| 3 | Employee list + search/filter/pagination | ✅ | ✅ | ❌ | ✅ | Move to server-side pagination (hybrid rec) |
| 4 | Employee full profile (PII) | ✅ | ✅ | ❌ | 🟡 4 fields only | birthDate, gender, civilStatus, address, contact, email + edit form |
| 5 | Employee CRUD + employment history | ✅ | ✅ | ❌ | ❌ | Create/edit forms, history tab |
| 6 | Org hierarchy tree | ✅ | ✅ | ❌ | 🟡 read-only | Inline move/rename (hybrid rec), add/remove unit |
| 7 | Payroll run creation workflow | ✅ | ✅ (DRAFT→APPROVED→POSTED) | ❌ | ❌ | Wizard: pick period → compute → review → approve |
| 8 | Payroll ledger view | ✅ | ✅ | ❌ | 🟡 static preview | Per-run, per-employee drill-down; running balance |
| 9 | Leave requests + approval | ✅ | ❌ no Leave model | ❌ | 🟡 mock approve | Schema model; credits/balances; detail approval pane (hybrid rec) |
| 10 | Audit trail viewer | ✅ | ✅ | ❌ | 🟡 list only | before/after JSON diff detail; filters by user/date |
| 11 | Audit hooks on mutations | ✅ | — | 🟡 middleware exists | — | Wire middleware into routes |
| 12 | COA/CSC reports generation | ✅ | — | ❌ | 🟡 cards only | pdfmake/ExcelJS render + download flow |
| 13 | Users & roles admin (RBAC matrix) | ✅ | ✅ | ❌ | ❌ | User CRUD, role assignment, permissions matrix |
| 14 | Modal dialogs | ✅ (DESIGN.md §4) | — | — | ✅ | `Modal.jsx` + `.modal-box` classes |
| 15 | Drawer (collapsible sidebar) | ✅ (DESIGN.md §4) | — | — | ✅ | 200ms collapse, icon rail |
| 16 | Notifications (toast + email) | ✅ (DESIGN.md §4) | ❌ | ❌ | 🟡 | Toasts + bell done; SMTP pending |
| 17 | PWA support | ✅ (docs) | — | — | ❌ | manifest + service worker |
| 18 | Appointments (CSC: permanent/casual/contractual) | ✅ (scope) | ❌ | ❌ | ❌ | Plantilla/appointment issuance module |
| 19 | DTR / Time & Attendance | ❌ not in docs; HRMS-standard | ❌ | ❌ | ❌ | Daily time record, biometrics sync |
| 20 | Employee self-service portal | HRMS-standard | ❌ | ❌ | ❌ | Payslip view, leave filing for staff |
| 21 | Payslip generation | HRMS-standard | ❌ | ❌ | ❌ | Per-employee PDF per run |
| 22 | Statutory deductions breakdown (GSIS, PhilHealth, Pag-IBIG, BIR tax) | implied by COA | 🟡 PayrollItem.deductions is single field | ❌ | ❌ | Line-item deduction models + UI |
| 23 | 13th month / bonuses / loans | HRMS-standard (LGU) | ❌ | ❌ | ❌ | Ledger types + models |
| 24 | Recruitment / applicant tracking | HRMS-standard | ❌ | ❌ | ❌ | Optional phase |
| 25 | Performance appraisal (IPCR/OPCR) | HRMS-standard (CSC) | ❌ | ❌ | ❌ | Optional phase |
| 26 | Training / L&D | HRMS-standard | ❌ | ❌ | ❌ | Optional phase |
| 27 | Global search / command palette | HRMS-standard | — | — | ❌ | Quick employee lookup |
| 28 | 404 page + error boundary | web-standard | — | — | ❌ | Router catch-all + React boundary |
| 29 | Confirmation dialogs on destructive actions | web-standard | — | — | ❌ | Needed before deny/post/delete |
| 30 | Virtualized tables (10k+ rows) | ✅ (hybrid rec) | — | — | ❌ | Needed at scale with master-detail |

## 3. Prioritized Build Order

### P0 — Foundation blockers (everything depends on these)
1. **Backend auth stack**: routes/controllers/services for `POST /auth/login`, bcrypt + JWT, seed users (one per role), `.env` with `SEED_DEFAULT_PASSWORD` — unlocks real credentials (replaces the mock login)
2. **Frontend `api/` + `stores/`**: Axios client with JWT interceptor, Zustand `auth` store — replaces `localStorage['auth']` hack
3. **RBAC wiring**: role from JWT → sidebar filtering + route guards (5 roles already in schema)
4. ~~404 + error boundary + confirmation dialogs~~ — **done 2026-09-09**

### P1 — Core modules (Phase 2 of implementation plan)
5. Employee CRUD with full PII form + employment history tab (schema fields already defined)
6. Org hierarchy management: tree CRUD with inline move/rename (hybrid rec §4)
7. Payroll run creation wizard honoring DRAFT→APPROVED→POSTED; ledger entries auto-written per Ledger Pattern
8. Leave module: add `LeaveRequest` + `LeaveCredit` models to schema, detail approval pane (hybrid rec §4)
9. ~~Modal + drawer components~~ — **done 2026-09-09** (`Modal.jsx`, collapsible `Sidebar`)

### P2 — Compliance & polish (Phase 3)
10. Audit detail viewer with before/after JSON diff; audit middleware wired into all mutating routes
11. Reports pipeline: pdfmake/ExcelJS render → Blob download; payslip generation (UI scaffolded, renderer pending)
12. Users & roles admin UI with permissions matrix (UI done; backend wiring pending)
13. Notifications: toast system + bell done; SMTP email alerts pending
14. PWA: manifest + icon done; service worker pending

### P3 — Benchmark parity (beyond docs, standard HRMS)
15. Statutory deduction line-items: GSIS, PhilHealth, Pag-IBIG, BIR withholding as models + payroll breakdown UI (COA auditability demands itemization — single `deductions` Decimal won't survive audit)
16. DTR/attendance module + biometrics import (universal in PH LGU HRIS; schema needs `Attendance` model)
17. Appointments module (CSC appointment issuance: permanent/temporary/casual/contractual)
18. Employee self-service (payslip self-view, leave self-filing) — role-scoped
19. 13th month, bonuses, loan amortization via LedgerType extensions
20. Recruitment, IPCR/OPCR appraisals, training records — optional, schedule last

## 4. Key Observations

- **The schema is ahead of both ends**: it models 10 entities the API never serves and the UI never edits. Most P0/P1 gaps are plumbing, not design.
- **Schema itself is missing 3 modules the docs/scope require**: Leave, Attendance/DTR, Appointments. Add before Phase 2 backend work.
- **Hybrid-architecture debts** (from the comparison doc): master-detail views currently hold all data client-side — fine for mocks, but must become server-paginated and virtualized before 10k+ employees; leave approval should gain a detail pane per the recommendation.
- **Single `deductions` field is an audit risk** — COA compliance practically requires per-statutory line items; plan the model split early even if UI shows aggregates first.
- **Design-system readiness is high**: every page consumes tokens; new modules (modals, drawers, toasts) can be added as component classes without touching page code.

