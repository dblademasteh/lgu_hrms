# AGENTS.md — LGU-HRMS Build Specification

> Living build spec + codebase map for autonomous coding agents. **Express 5 + plain-JS React 19** with a **custom Tailwind 4 design system**. Read §7 (Current State) before changing anything; execute §10 (Roadmap) order; keep this file current as the codebase evolves.

---

## §0. Agent Rules

You are a **senior full-stack engineer** building a production-grade HRMS for Philippine LGUs.

| # | Rule |
|---|---|
| 1 | **Do not re-scaffold what exists** (§7). Frontend is feature-complete against mock data; backend is a skeleton (§10). |
| 2 | Frontend changes preserve the design-token system (§9). **Zero hardcoded colors** — verify with color lint (§8). |
| 3 | `npm run build` in `frontend/` must pass after every task. |
| 4 | Commit per completed unit with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`). |
| 5 | Never hardcode secrets. Use `.env` + `.env.example`; never commit them. |
| 6 | All monetary values: `Decimal(12,2)`, never floats. |
| 7 | All dates/times stored UTC (`Timestamptz`); displayed `Asia/Manila`. |
| 8 | Every mutating endpoint writes append-only `AuditLog`. |
| 9 | Soft delete (`deleted_at`) — add columns when wiring models to API. |
| 10 | **Mock-first:** UI uses `src/data/mock.js`; backend wiring swaps for `src/api/` calls with identical shapes. Do not invent new shapes — extend `mock.js` and Prisma schema together. |
| 11 | Record all changes to either Agent.md or Design.md
---

## §1. Project Context

The system serves LGU HR/Admin offices and complies with Philippine civil service and government payroll rules.

### Users & Roles

| Persona | Schema Role |
|---|---|
| HRMO — plantilla, appointments, records | `HR_MANAGER` |
| Payroll Officer / Accounting — payroll runs, remittances | `PAYROLL_OFFICER` |
| Department/Office Heads — approvals, evaluations | `DEPARTMENT_HEAD` |
| System Administrator | `ADMIN` |
| Auditor (COA) — read-only oversight | `AUDITOR` |
| Employees (ESS portal, planned) | future `EMPLOYEE` |

**Employment classifications:** Permanent, Temporary, Casual, Contractual, Job Order (JO — no employer-employee relationship, no leave/GSIS benefits), COS, Coterminous, Elected Officials.

---

## §2. Regulatory Requirements

Model business logic around these real rules — do not invent generic HR logic:

| Domain | Governing Rule | Notes |
|---|---|---|
| Data Privacy | RA 10173 (Data Privacy Act of 2012) | Consent logging, data minimization, breach notification, NPC registration reference |
| Leave | CSC Omnibus Rules (MC No. 41, s. 1998, as amended) | VL/SL 1.25 days/month each; SPL 3 days/yr; Maternity 105d (RA 11210); Paternity 7d (RA 8187); Solo Parent 7d (RA 8972/11861); Special Leave for Women 60d (RA 9710) |
| Compensation | RA 11466 / SSL V, DBM Salary Grade Table | SG 1–33, Step 1–8 |
| Contributions | GSIS (RA 8291) permanent/regular; SSS JO/COS; PhilHealth (RA 11223); Pag-IBIG (RA 9679) | Rules differ per employment type |
| Withholding Tax | BIR TRAIN Law (RA 10963) | Auto-compute per taxable income bracket |
| 13th Month / Bonus | PD 851, DBM Budget Circulars | Year-End Bonus + Cash Gift |
| Attendance | CSC MC No. 04, s. 1991 (DTR) + biometrics | Daily Time Record, undertime/tardiness deductions |
| Appointment | CSC Omnibus Rules on Appointments (RA 1080) | Plantilla item, classification, eligibility, vacancy tracking |
| Audit | Commission on Audit (COA) | Payroll register, disbursement voucher, 201 file audit trail |
| Retirement | RA 8291 (GSIS), RA 660, RA 1616 | Compulsory at 65, optional at 60 with 15 yrs service |

> **Build configurable rule tables** (leave rates, contribution brackets, tax brackets, SG/step matrix) — these change via law/DBM circulars.

---

## §3. Tech Stack & Architecture

### Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 (JSX) + Vite 5 | Plain JS, no TypeScript compilation — `allowJs: true` |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) | `@import "tailwindcss"`, not legacy `@tailwind` |
| Routing | react-router-dom 6 | 11 routes + 404 catch-all |
| Fonts | @fontsource-variable Inter, Sora, JetBrains Mono | Self-hosted, no CDN |
| UI Kit | None — own token-driven component system | See §9 Frontend Conventions |
| Backend | Node.js ESM + Express 5 | helmet, cors; `src/server.js` on port 4000 |
| Database | PostgreSQL 16 + Prisma 5.20 ORM | docker-compose |
| Auth | JWT (access ~15m + refresh rotation) + bcrypt | **PLANNED** — mock `localStorage['auth']` gate currently |
| Reporting | pdfmake (PDF) / ExcelJS (XLSX) | **PLANNED** — no Puppeteer (low on-prem memory) |
| Jobs | pg-boss (Postgres-backed queue, same DB) | No Redis; payroll batch + accrual crons |
| Types | Zod contracts shared FE/BE | `mock.js` shapes migrate here first |
| Infra | Docker Compose | postgres:16, api:4000, web:5173 |
| Testing | Vitest + Supertest | Add when first API lands; >80% on payroll engine + leave accrual |
| PWA | manifest in place; SW deferred to P2 | Dev-mode caching hurts HMR |

**Deployment:** on-premise LGU data center or DICT GovCloud. Data residency + offline resilience matter; offline-first is a stretch goal, not MVP.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│               LGU data center (on-prem, Docker)              │
│                                                              │
│  ┌──────────────────┐        ┌────────────────────────────┐ │
│  │ React 19 SPA     │ HTTPS  │ Express 5 API (/api/v1)    │ │
│  │ (Vite, Nginx)    │───────►│ Route → Controller →       │ │
│  │ Admin console    │  JWT   │ Service → Repository       │ │
│  │ (ESS later,      │        │ Zod · RBAC · audit mw ·    │ │
│  │  role-gated)     │        │ payroll engine (decimal)   │ │
│  └──────────────────┘        └─────────────┬──────────────┘ │
│                                            │                │
│                                            ▼                │
│                                     ┌────────────┐          │
│                                     │ PostgreSQL │          │
│                                     │ 16 Prisma  │          │
│                                     │ Decimal    │          │
│                                     └──────┬─────┘          │
│                                            │                │
│                                            ▼                │
│                                     ┌──────────────┐        │
│                                     │ pg-boss      │        │
│                                     │ (same DB)    │        │
│                                     │ Payroll      │        │
│                                     │ Accruals     │        │
│                                     └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

### Layer Rules

| Layer | Responsibility | Constraints |
|---|---|---|
| Route (Controller) | Parse HTTP, delegate, respond | No business logic |
| Service | Business rules + transactions; emit audit events | Never touch `req`/`res` |
| Repository | Prisma queries only | No HTTP concepts |
| Contracts (`shared/contracts`) | Zod schemas per endpoint | Request/response validation (BE) + inferred TS types (FE). Single source of truth |
| Payroll engine | Pure decimal functions (`decimal.js`) | Zero I/O, isolated module, table-driven unit tests |

### Cross-Cutting Concerns

| Concern | Implementation |
|---|---|
| AuthN/AuthZ | bcrypt hashes; JWT access (~15m) + refresh rotation; RBAC checks `role` **and department scope**. TOTP 2FA for ADMIN/PAYROLL pre-go-live. |
| Audit | Append-only `AuditLog` on every mutation (before/after JSON, user, IP) via `middleware/audit.js` — wired from first endpoint, never retrofitted. |
| Errors | One JSON envelope: `{ error: { code, message, details? } }`; client maps to toasts. |
| API conventions | Base `/api/v1`, `Authorization: Bearer <jwt>`, pagination `?page=1&limit=50`, filtering `?search=&status=`. Two FE surfaces: Admin Console (built) + ESS (planned). |
| Files | 201 documents/IDs on filesystem volumes (backed up with DB); MinIO optional later — no cloud subscriptions. |
| Jobs | pg-boss (Postgres schema, same DB — zero new infra) for payroll batch + leave-accrual crons. Redis/Valkey = escape hatch if queue volume demands it. |
| Testing | Vitest + Supertest; payroll engine + leave accrual rules are coverage-critical (>80%). |

### Zero-Subscription Posture

Every runtime component is open-source and self-hosted: PostgreSQL, Express, React, Vite, Tailwind, Prisma, pg-boss, pdfmake/ExcelJS, Nginx, Docker. **No managed database, no SaaS auth, no cloud storage, no usage-based billing.** Recurring cost = hardware + people only.

---

## §4. Core Modules

| # | Module | UI Status | API Status | Notes |
|---|---|---|---|---|
| 1 | 201 File / Employee master data | ✅ scaffolded (mock) | ❌ | Tabbed profile (info/history/payroll), full-PII CRUD, search + dept filter + client-side pagination |
| 2 | Organizational structure | ✅ scaffolded (mock) | ❌ | Tree with add/rename/remove (child-guard) |
| 3 | Attendance & DTR | ✅ scaffolded (mock) | ❌ | Date-filtered DTR + summary; biometric/CSV import = wire later |
| 4 | Leave management | ✅ scaffolded (mock) | ❌ | Detail approval pane + credits display; **schema model missing** — add LeaveRequest/LeaveCredit |
| 5 | Payroll | ✅ scaffolded (mock) | ❌ | 3-step run wizard (→DRAFT), run detail, payslip modals with statutory deduction line-items |
| 6 | Appointments | ✅ scaffolded (mock) | ❌ | CSC types, plantilla item numbers; **schema model missing** |
| 7 | Audit trail | ✅ scaffolded (mock) | ❌ | Before/after JSON diff viewer; middleware exists in `backend/src/middleware/audit.js` (unwired) |
| 8 | Reports | 🟡 cards + toasts | ❌ | pdfmake/ExcelJS rendering pending |
| 9 | Users & RBAC | ✅ scaffolded (mock) | ❌ | User CRUD + permissions matrix; JWT/role guards pending |
| 10 | Employee Self-Service | ❌ | ❌ | Roadmap (§10 P3) |
| 11 | Notifications | 🟡 in-app toasts + bell | ❌ | Toast system + bell done; SMTP email service pending |

---

## §5. Data Model

### Existing `backend/prisma/schema.prisma` (10 models)

```
User(id, username, passwordHash, role[ADMIN|HR_MANAGER|PAYROLL_OFFICER|DEPARTMENT_HEAD|AUDITOR],
     departmentId?, externalId?)
Department(id, code, name, parentId?, level)
Position(id, title, salaryGrade, step?)
Employee(id, employeeNumber, firstName, lastName, middleName?, birthDate, gender, civilStatus,
     address, contactNumber?, email?, status[ACTIVE|INACTIVE|RESIGNED|RETIRED],
     departmentId, positionId, hiredDate)
EmploymentHistory(id, employeeId, departmentId, positionId, startDate, endDate?)
PayrollPeriod(id, name, startDate, endDate, fiscalYear)
PayrollRun(id, periodId, runDate, status[DRAFT|APPROVED|POSTED], createdBy)
PayrollItem(id, employeeId, runId, basicPay, allowances, deductions, netPay)
LedgerEntry(id, runId, employeeId, type[PAY|DEDUCTION|ADJUSTMENT], amount, balance, reference?)
AuditLog(id, userId, action, entity, entityId, before?, after?, ip?, timestamp)
```

All `PayrollItem`/`LedgerEntry` monetary fields are `Decimal(12,2)`.

### Planned Additions (see `FEATURE_GAP_ANALYSIS.md`)

| Model | Purpose |
|---|---|
| `LeaveRequest` | Per-type leave applications with approval workflow |
| `LeaveCredit` | Per-type balances (VL/SL/SPL/etc.) per §2 rules |
| `Attendance` | Biometric/manual source, tardiness tracking |
| `Appointment` | CSC appointment types, plantilla item linkage |
| `PayrollItem` line items | gsisEe/Er, philhealthEe/Er, pagibigEe/Er, withholdingTax — a single `deductions` field will not survive COA audit |
| `SalaryStep` | Versioned per DBM circular |
| `PerformanceReview` | SPMS/OPCR-IPCR |
| `Payslip` | Per-run payslip with all deduction breakdowns |

---

## §6. Codebase State

### Frontend — feature-complete scaffold (all data mocked)

- **Routes:** Login, Dashboard, Employees, Organization, Payroll, Leave, Attendance, Appointments, Audit, Reports, Users & Roles (+ 404 catch-all)
- **Interactive features:** employee search/filter/pagination/CRUD, org tree management, leave approve/deny with confirmations, payroll run wizard, audit entity filter + diff viewer, user admin, theme toggle (light/dark), collapsible sidebar, notification bell, command palette (`Ctrl+K`), toasts
- **Design system:** semantic tokens (`--bg/--surface/--accent/--success/--warning/--error/--ink/--muted/--line`) with light + dark themes via `<html data-theme>`, persisted in `localStorage['lgu-theme']`, exposed to Tailwind via `@theme inline`
- **Infrastructure:** `ToastProvider`, `ErrorBoundary`, PWA `manifest.webmanifest` + icon (service worker pending)
- **Awaiting wiring:** `frontend/src/api/`, `frontend/src/stores/` (theme uses `src/theme.js` hook instead of Zustand — adopt or delete deliberately)

### Backend — skeleton

- `src/server.js` — helmet + cors + `/api/v1/health` on port 4000
- `middleware/auth.js` + `middleware/audit.js` (unwired)
- **No routes/controllers/services, no seed, no `.env`**

### Docs in Repo

| File | Content |
|---|---|
| `AGENTS.MD` | This file |
| `DESIGN.md` | Design system: tokens, component classes, page specs |
| `FEATURE_GAP_ANALYSIS.md` | 30-item gap matrix + P0–P3 priorities |
| `HRMS_Architectural_Comparison.md` | Hybrid architecture rationale |
| `README.md` | Project overview |

`DESIGN_DOCUMENT.md` and `IMPLEMENTATION_PLAN.md` were deleted as redundant (2026-09-09) — content consolidated into this file and `DESIGN.md`.

---

## §7. Repository Layout

```
lgu-hrms/
├── AGENTS.MD
├── DESIGN.md
├── FEATURE_GAP_ANALYSIS.md
├── HRMS_Architectural_Comparison.md
├── README.md
├── docker-compose.yml              # postgres:16 + api:4000 + web:5173
├── backend/
│   ├── package.json                # dev: node --watch src/server.js
│   ├── prisma/schema.prisma        # 10 models (§5)
│   └── src/
│       ├── server.js               # Express 5 entry
│       └── middleware/
│           ├── auth.js             # JWT verification (unwired)
│           └── audit.js            # AuditLog writer (unwired)
└── frontend/
    ├── index.html                  # theme bootstrap (no FOUC), manifest links
    ├── public/
    │   ├── manifest.webmanifest
    │   └── icon.svg
    └── src/
        ├── index.css               # design tokens + component classes (§9)
        ├── theme.js                # light/dark apply/toggle + useTheme hook
        ├── App.jsx                 # router (11 routes + 404)
        ├── data/mock.js            # single mock layer — swap for API calls later
        ├── api/                    # EMPTY — reserved for Axios client
        ├── stores/                 # EMPTY — reserved for Zustand
        ├── components/
        │   ├── Layout.jsx          # shell wrapper
        │   ├── Sidebar.jsx         # nav + collapsible
        │   ├── Header.jsx          # page title + breadcrumb + bell
        │   ├── Modal.jsx           # sm/md/lg
        │   ├── ConfirmDialog.jsx
        │   ├── Toast.jsx
        │   ├── Tabs.jsx            # .tabbar/.tab
        │   ├── MasterTable.jsx     # .data-table
        │   ├── DetailPane.jsx      # slide-in panel
        │   ├── EmployeeForm.jsx    # full-PII CRUD
        │   ├── CommandPalette.jsx  # Ctrl+K
        │   ├── ErrorBoundary.jsx
        │   └── NotFound.jsx
        └── pages/
            ├── Login.jsx
            ├── UserDashboard.jsx
            ├── Employees.jsx
            ├── Organization.jsx
            ├── Payroll.jsx
            ├── Leave.jsx
            ├── Attendance.jsx
            ├── Appointments.jsx
            ├── Audit.jsx
            ├── Reports.jsx
            └── Users.jsx
```

---

## §8. Commands

```bash
# ── Frontend ──
cd frontend
npm run dev          # Vite dev → http://localhost:5173 (HMR)
npm run build        # production build — MUST pass before committing

# Color lint (zero output = clean)
Get-ChildItem src -Recurse -Include *.jsx,*.js |
  Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|slate-|gray-|bg-white|text-white'

# ── Backend ──
cd backend
npm run dev          # node --watch src/server.js → http://localhost:4000
npx prisma migrate dev --name init   # once .env DATABASE_URL exists
npx prisma studio

# ── Full Stack ──
docker compose up -d --build
```

---

## §9. Frontend Conventions

1. **Design tokens only.** Colors from `src/index.css` (`:root` / `[data-theme='dark']`) via `@theme inline`: `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `text-error`, `border-line`, `bg-accent/10`, `text-accent`, `text-accent-ink`, `font-display`, `font-mono`. Never hex/slate/gray in JSX (§8 lint).
2. **Component class system** (`DESIGN.md` §4, `@layer components`): `.btn/.btn-primary/.btn-ghost/.btn-danger`, `.input` (10px radius, accent ring, `aria-invalid`), `.card`, `.stat`/`.stat-value`, `.badge` (`-success/-error/-accent/-warning` via `--badge-color`), `.data-table` (sticky mono uppercase thead, 5% hover), `.sidebar-link` (200ms, `aria-current`), `.modal-box` (+sm/md/lg), `.toast`, `.tabbar/.tab`, `.mono-label`, `.dropdown-panel`. Use these before writing new CSS; extend `index.css` only when pattern repeats ≥3×.
3. **Typography:** Sora = headings (`font-display`), Inter = body (default), JetBrains Mono = machine labels + money/figures (`font-mono`, `.mono-label`, `.stat-value`, tabular-nums).
4. **Mock layer discipline:** datasets in `src/data/mock.js` shaped like future API responses; shared helpers (`badgeTone()`) live there. Pages own state; components stay presentational.
5. **Accessibility:** 2px accent `:focus-visible` outline (global), `aria-label` on icon buttons, `aria-current` nav, `aria-invalid` inputs, `role="status"` toasts, `prefers-reduced-motion` respected, WCAG AA contrast — verify both themes.
6. **Motion:** interaction feedback only (150–200ms). No decorative animation (DESIGN.md §1).
7. **New page checklist:** wrap in `<Layout>`, route in `App.jsx`, sidebar item in `Sidebar.jsx`, title in `Header.jsx`, consume tokens only.

---

## §10. Backend Conventions

1. **Layer discipline:** Route → Service → Repository. Routes handle HTTP only. Services own business logic + transactions. Repositories own Prisma queries. Never skip layers.
2. **Audit on every mutation:** `middleware/audit.js` writes `{ userId, action, entity, entityId, before, after, ip }` to `AuditLog`. Wire from the first endpoint — never retrofit.
3. **Error envelope:** All errors return `{ error: { code: string, message: string, details?: any } }`. Use AppError class with HTTP status codes.
4. **Validation:** Zod schemas in `shared/contracts/` for every request body/params/query. Validate in route middleware before calling service.
5. **RBAC middleware:** Check `role` **and department scope** per route. Role permissions defined centrally, not per-route.
6. **Decimal precision:** All monetary fields use `Decimal(12,2)` via Prisma. Never use JavaScript floats for money.
7. **Soft delete:** Add `deletedAt` column when wiring models. Filter `WHERE deletedAt IS NULL` in repository methods.
8. **Environment:** `.env` for all config (`DATABASE_URL`, `JWT_SECRET`, `SEED_DEFAULT_PASSWORD`). `.env.example` committed without values.
9. **Seed:** `prisma/seed.js` creates default users per role (§1) with `SEED_DEFAULT_PASSWORD`. Run after `prisma migrate dev`.
10. **File structure:**
    ```
    backend/src/
    ├── server.js              # Express app + middleware + route mounting
    ├── middleware/
    │   ├── auth.js            # JWT verification + role extraction
    │   ├── audit.js           # AuditLog writer
    │   └── rbac.js            # Role + scope checks (planned)
    ├── routes/                # One file per resource (employees.js, payroll.js, etc.)
    │   └── index.js           # Mount all routes under /api/v1
    ├── controllers/           # Parse req, call service, send res
    ├── services/              # Business logic + transactions
    ├── repositories/          # Prisma queries
    └── lib/
        ├── prisma.js          # PrismaClient singleton
        ├── errors.js          # AppError class
        └── decimal.js         # decimal.js helpers (planned)
    ```

---

## §11. Roadmap

Full gap matrix in `FEATURE_GAP_ANALYSIS.md`.

| Priority | Phase | Work |
|---|---|---|
| **P0** | Foundation | Backend auth stack: `POST /api/v1/auth/login`, bcrypt + JWT, controllers/services, seed users per role, `.env` + `SEED_DEFAULT_PASSWORD` → Frontend `api/` Axios client with JWT interceptor + Zustand auth store → RBAC wiring (role → sidebar/route guards) → Replace mock login. Schema additions first: `LeaveRequest`, `LeaveCredit`, `Attendance`, `Appointment`. |
| **P1** | Wire Modules | Employees, org, payroll runs (DRAFT→APPROVED→POSTED + ledger writes), leave approvals, audit middleware hookup, reports rendering (pdfmake/ExcelJS), server-side pagination + virtualized tables (10k+ employees). |
| **P2** | Compliance | Statutory deduction line-items (PayrollItem/Payslip), configurable rule tables (§2), audit before/after for every mutation, service worker + PWA polish. |
| **P3** | Benchmark Parity | ESS portal (payslip self-view, leave self-filing), DTR biometrics import, 13th month/loans, recruitment, IPCR/OPCR appraisals, training, 2FA for privileged roles. |

---

## §12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | RBAC on every endpoint, 2FA for privileged roles (target), encrypted at rest + TLS in transit, full audit trail, RA 10173 compliance |
| Performance | <2s page load; payroll run for 500 employees < 2 min (async job with progress tracking) |
| Availability | On-prem; graceful degradation if biometric device offline |
| Accessibility | WCAG 2.1 AA |
| Localization | English default, Filipino labels toggle optional |
| Data Retention | NAP schedules; separated-employee data archived, never hard-deleted |

---

## §13. Definition of Done (per module)

- [ ] CRUD + business rules implemented; unit tests >80% on business logic
- [ ] RBAC enforced on every endpoint
- [ ] Audit logging wired for every mutation
- [ ] Frontend screens consume real API with loading/error/empty states (mock imports removed)
- [ ] `npm run build` passes; color lint clean; both themes spot-checked
- [ ] Reviewed against relevant regulation in §2

---

## §14. Open Configuration Points

Require client/LGU input before go-live:

| Item | Notes |
|---|---|
| Office/department org chart | Specific LGU structure |
| DBM Salary Schedule version | Current version in effect |
| Biometric device | Brand/model + integration method (SDK vs CSV) |
| Payroll disbursement bank | e.g., Land Bank LDDAP-ADA |
| COS/JO scope | Typically excluded from GSIS/leave benefits |
| PWA icon set | PNG sizes for install prompts |

## §15. Settings > Account Recommendations

Adopted from UX review 2026-09-09. Implement profile completeness, security controls, and data privacy compliance in Settings > Account.

| Category | Feature | UX Benefit | Tech / Privacy |
|---|---|---|---|
| User Management | Profile completeness meter | Nudges complete 201 file | Compute score server-side, audit changes |
| User Management | Role & department scope viewer | Transparency of permissions | Derived from JWT + RBAC, no PII export |
| User Management | Delegated access / Acting authority | Continuity during leave | Delegation model with dates, audit log |
| Security | Password policy + strength meter | Reduces weak passwords | bcrypt cost 12+, zxcvbn, history |
| Security | 2FA / TOTP with backup codes | Privileged role hardening | Encrypt secret, audit enable/disable |
| Security | Session management | User control over access | Refresh token rotation, device list |
| Security | Login history & anomaly alerts | Early breach detection | Append-only LoginEvent, NAP retention |
| Profile | Avatar & signature upload | Personalization + doc auth | File validation, volume storage, consent |
| Profile | Display preferences | Comfort | Store prefs, non-sensitive |
| Privacy | Data export / deactivation | RA 10173 portability/erasure | Export job, soft delete, audit |
| Compliance | Notification channel consent | Reduces noise | Consent timestamp logged |

All mutating actions write AuditLog with before/after, userId, IP. PII encrypted at rest, dates UTC, displayed Asia/Manila.
