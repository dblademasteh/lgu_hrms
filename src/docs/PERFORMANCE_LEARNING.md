# Performance & L&D (SPMS / Training) — Module Deep Dive

> Hardening pass + CSC SPMS / PRIME-HRM benchmark — Sep 2026. Update this doc when module conventions change.

## Surfaces
- `/performance` — **Performance Reviews** (`frontend/src/pages/Performance.jsx`, read-only summary: total/IPCR/OPCR cards + table).
- `/ipcr` — **IPCR/OPCR Appraisal** (`frontend/src/pages/IPCR.jsx`, the SPMS editor): review list, create-review modal (employee/type/year/period/weights/parent OPCR/comments), contextual status workflow buttons, weights + comments editor, Part I targets (server-side add/update/delete on Save), Part II competencies (inline picker, per-row edit+save, catalog modal), Part III summary, compute, and print via `buildIPCRFHtml` → `openHtmlString`.
- `/learning` — **Learning & Development** (`frontend/src/pages/Learning.jsx`, training programs CRUD + enrollments CRUD with complete/track lifecycle; see "Learning module analysis (Sep 2026 scan)" below).
- Employee DetailPane tabs **Performance** + **Training** are read-only relation views (`employeeSectionService.RELATIONS` → `performanceReview` / `trainingEnrollment`), gated `employeeRecordsCRUD`.

## Backend layout
- `backend/src/routes/performance.js` — /competencies catalog CRUD, /performance reviews CRUD, /:id/targets CRUD, /:id/competencies (matrix items), /:id/compute.
  - Competency create/patch gated `requirePermission('manageUsersAndRoles')`, delete `requireRole('ADMIN')`.
  - Review POST/PATCH/DELETE/compute + target/competency-item writes gated **`requireRole('ADMIN')`** (SUPER_ADMIN bypass).
  - **Reads are auth-only** — any authenticated user can list/detail every review incl. employee names/ratings (leak vs ESS precedent).
- `backend/src/routes/training.js` — full router behind `requirePermission('trainingCRUD')` (matrix-backed): /programs CRUD + /enrollments CRUD (GET list, POST with 409 dup guard, PATCH status transitions, DELETE pending-only).
- `backend/src/services/performanceService.js` — status transition map, `computeAndPersistReviewRating`, target/competency derived-field recompute, office-rating-cap on `APPROVED`. Throws plain `Error` with `status`/`code` (not `AppError`) — fine because the global middleware reads `err.status`.
- `backend/src/lib/performanceEngine.js` — CSC MC No. 6 s. 2012 title: five-point target-ratio scale (5 ≥130%, 4 115–129%, 3 100–114%, 2 51–99%, 1 ≤50%), Part I weighted group average, Part II competency weighted average, `computeFinalRating` (PartI·p% + PartII·cw%, office-cap clamp), `adjectivalLabel`.
- `backend/src/repositories/performanceRepository.js` / `trainingRepository.js` — all reads `withTenant`, writes `stampTenant`; update/delete use `where: withTenant(req,{id})` (verified valid on Prisma 5.22).

## Lifecycle
### Review status machine (`ALLOWED_TRANSITIONS`)
- PLANNING → MONITORING | CANCELLED | REVIEW
- MONITORING → REVIEW | PLANNING | CANCELLED
- REVIEW → APPROVED | REJECTED | MONITORING
- APPROVED (terminal) · REJECTED → MONITORING · CANCELLED (terminal)
- APPROVE computes + persists `rating`/`adjectivalRating` + stamps `approvedBy/approvedAt`; REVIEW stamps `reviewedBy/reviewedAt`. New reviews must start PLANNING or MONITORING.

### Enrollments
- Full CRUD + lifecycle wired: POST (ENROLLED default, 409 on duplicate via `findEnrollmentDuplicate` + UNIQUE `[tenantId, programId, employeeId]`), PATCH `ENROLLED→COMPLETED` (stamps `completedAt`) / `→CANCELLED` (terminal states guarded → 422), DELETE pending-only. Contract enum realigned to DB `EnrollmentStatus={ENROLLED,COMPLETED,CANCELLED}`.

## Computation model
1. Per target: `averageScore` = mean of Q/E/T (1–5); `actualPercent` = annualActual/targetQuantity.
2. Part I = Σ(groupAvg × groupWeight%) over CORE/STRATEGIC/SUPPORT (weights 50/30/20 defaults).
3. Part II = weighted average of competency scores (weight default 10, maxScore 5).
4. Final = PartI·(100−competencyWeight)% + PartII·competencyWeight% (default 30%).
5. Adjectival: ≥4.51 Outstanding, ≥3.51 Very Satisfactory, ≥2.51 Satisfactory, ≥1.51 Unsatisfactory, else Poor (SPMS midpoint scale).
6. `officeRatingCap` (OPCR cap) clamps the final rating — the OPCR→IPCR cascade basis.

## Findings — live-verified (Sep 2026 harden scan)
Full list in `TODOS.md` → "Performance & L&D deep-dive findings". Headline:
1. **Enrollment `IN_PROGRESS` → 500**; **duplicate enrollments allowed**; **no enrollment lifecycle PATCH**.
2. **EMPLOYEE can read the whole review ledger** (GET /performance auth-only).
3. **UI could not author anything** (resolved — `IPCR.jsx` rewrite, Sep 2026): create-review modal, status/approve workflow buttons, server-side target delete, competency catalog + Part II add/save, SPMS-style IPCRF print via `openHtmlString` are all wired to `api/performance.js`.
4. **Writes are ADMIN-only** — HR_MANAGER/DEPARTMENT_HEAD (the CSC rater) blocked at the route layer; the UI already gates on the `performanceCRUD` capability, so switching the router to `requirePermission` is the remaining step.
5. **Dead nav + dead route stubs**: Sidebar IDP/Awards/TNA/L&D Plans/Evaluations → NotFound; `trainingEvaluations`/`awards`/`ldPlans`/`tna` route files import missing controllers/contracts (unmounted); `performanceCRUD` capability referenced but undefined.
6. **Review uniqueness missing** — 4× duplicate OPCR reviews in dev DB (no UNIQUE `[employeeId, reviewYear, reviewType]`).

## Recommended direction
- **Correctness first:** align enrollment enum/contract, add composite UNIQUE on enrollments + 409, add enrollment PATCH transitions, move review reads out of auth-only (performanceRead-style gating), + unique review constraint for `[employeeId, reviewYear, reviewType]`.
- **Wire the editor** (mostly shipped — Sep 2026 IPCR.jsx rewrite): create-review modal ✓, status-transition controls ✓, server-side target delete on save ✓, competency catalog + Part II add/save ✓, honest print (SPMS Form 1 IPCRF HTML) ✓. Remaining: sign-off **notifications**, **mid-year (MONITORING) capture** UX, backend route gating via `requirePermission('performanceCRUD')` (drop `requireRole('ADMIN')`), and the `parentReviewId` TDZ bug in `updatePerformanceReview`.
- **Dead code:** decide mount-or-delete for `awards`/`tna`/`ldPlans`/`trainingEvaluations`, define `performanceCRUD`/`performanceRead` capabilities, prune unused `utils/performance.js`.

## Learning module analysis (Sep 2026 scan — verified live)

### Who can access/edit
- Backend: entire `/training` router behind `requirePermission('trainingCRUD')` — **ADMIN, HR_MANAGER, SUPER_ADMIN** (`trainingCRUD: true`); PAYROLL_OFFICER, DEPARTMENT_HEAD, AUDITOR, EMPLOYEE denied. Every mutation passes through the global `auditLog` mount.
- Frontend: `/learning` gated ADMIN/HR_MANAGER/SUPER_ADMIN + capability `trainingCRUD` (App.jsx); Sidebar item rank/capability-gated.
- DetailPane **Training** tab: read-only relation view (405 on writes), gated `employeeRecordsCRUD`.
- ESS: **no training surface** — employees cannot see their own training history in the portal.

### Verified live bugs
1. ~~**Delete program with enrollments → HTTP 500**~~ **fixed (Sep 2026)**: `trainingService.deleteProgram` guards with `countEnrollmentsByProgram` → 409 `ENROLLMENTS_EXIST` with count + guidance; UI confirm message corrected. Verified live: DELETE program-with-enrollments → 409.
2. ~~**Enroll dropdown capped at 50 employees**~~ **fixed**: `listEmployees({ page: 1, limit: 200 })`.
3. ~~**Uncontrolled enroll `<select>`**~~ **fixed**: controlled via `enrollSelects` keyed by program id; reset after successful enroll.
4. ~~**Stat cards count only the first 50 enrollments**~~ **fixed**: Enrollments card uses the paginated `total`.

### UX/API gaps
- ~~No search/filter UI~~ **fixed**: debounced (300ms) program search (code/title) + enrollment status filter wired to the API (`search`, `status`).
- `getProgram` (detail with enrollments include) exists but no program detail view uses it.
- ~~`fmtDate` without Asia/Manila~~ **fixed**: `toLocaleDateString('en-US', { …, timeZone: 'Asia/Manila' })`.
- ~~No seed data~~ **fixed**: `seed.js` seeds 8 LGU-relevant programs per tenant + 10 mixed-status enrollments (tenant-prefixed codes for the global `code` UNIQUE).
- ~~`trainingCRUD` missing from `CAPABILITY_ROUTES`~~ **fixed**: route map entry added.
- No pagination controls in the tables (fixed limit 200 per fetch — acceptable until 10k+ scale).

### Modeled but unwired (L&D pillar)
`TrainingEvaluation` (Kirkpatrick L1–L4 reaction/learning/behavior/results), `TrainingNeedsAssessment`, `LdPlan` — schema + migrations exist (`20260916103000`), **no routes/controllers/contracts/UI**. Dead-code decision: mount or delete.

## Benchmark vs CSC SPMS / PRIME-HRM
- **Engine ✓** five-point scale + IPCRF Part I/II/III per CSC MC No. 6 s. 2012.
- **Workflow partial:** statuses track SPMS planning/monitoring/evaluation; missing UI for who-what-when sign-off, no mid-year review capture screen, no OPCR→IPCR cascade editor (`parentReviewId` TDZ code path, key stripped by Zod), no notification on REVIEW request.
- **L&D partial (ML1):** `TrainingProgram`/`TrainingEnrollment` real; `TrainingEvaluation` (Kirkpatrick L1–L4 reaction/learning/behavior/results), `TrainingNeedsAssessment`, `LdPlan`, `IDP`, `Competency`/`PerformanceCompetency` all **modeled but unmounted**.
- **PRIME-HRM ERs:** PM pillar ERs map to review lifecycle + approval; L&D pillar needs TNA instrument, annual plan + utilization report by enrollment, L1–L2 eval capture, IDP editor — all future work per `src/docs/PRIME_HRM_EVIDENCE.md`.