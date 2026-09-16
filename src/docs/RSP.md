# RSP Module — Recruitment, Selection & Placement (Deep Dive)

> Reference: verified directly against `backend/src/routes|controllers|services|repositories`, `backend/src/shared/contracts`, `backend/prisma/schema.prisma`, and `frontend/src/pages|api|App.jsx|Sidebar.jsx` (Sep 2026).
> Bucket: Recruitment, Selection & Placement = **Vacancy, Vacancy Publications, Recruitment/Applicant, Interviews, Appointments, Plantilla, Designation, Disqualifications (DIBAR), Eligibility**.
> CSR anchors: CSC-PRIME HRM RSP system, CSC MC 21 s.2015 (Merit Selection Board), 2025 Omnibus Rules on Appointments, CSC Memorandum re: Plantilla/ORA-OhRA.

## 1. Surface

### Backend path map (all mounted after global `requireAuth`→`tenantContext`→`auditLog` in `routes/index.js`)
Capability keys (matrix-backed, no whitelisted RSP route) — `requirePermission`:

| Module | Route file | Gate | Methods |
|---|---|---|---|
| Vacancy | `routes/vacancy.js` | `recruitmentCRUD` | GET /, GET /:id, POST, PATCH, DELETE |
| Vacancy Publications | `routes/vacancyPublications.js` | `recruitmentCRUD` | GET list, POST, DELETE |
| Recruitment (Applicants) | `routes/recruitment.js` | `recruitmentCRUD` | GET/POST `/applicants`, PATCH `/applicants/:id`, POST `/applicants/:id/hire`, GET/POST `/eligibilities` |
| Interviews | `routes/interviews.js` | `interviewCRUD` | GET /, GET /:id, POST, PATCH, DELETE |
| Appointments | `routes/appointments.js` | GET `appointmentsRead`; writes `appointmentsCRUD` | GET /, POST, PATCH /:id, DELETE /:id (soft) |
| Plantilla | `routes/plantilla.js` | `employeeRecordsCRUD` | GET /, GET /:id, POST, PATCH, DELETE |
| Designation | `routes/designation.js` | `appointmentsCRUD` (incl. GET) | GET /, GET /:id, POST, PATCH, DELETE |
| Disqualifications | `routes/disqualifications.js` | `disqualificationCRUD` per route | GET /, GET /report, GET /active, GET /:id, POST, PATCH, DELETE |

Models (`schema.prisma`): `Vacancy`, `VacancyPublication`, `Applicant`, `Interview`, `Appointment`, `PlantillaItem`, `DesignationOrder`, `Eligibility`, `Disqualification`.
Status enums (ground truth, `schema.prisma:895-964`):

```
ApplicantStatus     NEW APPLIED SCREENED SHORTLISTED INTERVIEWED OFFERED HIRED REJECTED DISQUALIFIED
AppointmentStatus   PENDING APPROVED VERIFIED ISSUED EFFECTIVE ENDED SEPARATED
AppointmentType     PERMANENT TEMPORARY CASUAL CONTRACTUAL JOB_ORDER COS COTERMINOUS
DesignationStatus   DRAFT RECOMMENDED APPROVED ISSUED EFFECTIVE REVOKED
InterviewStatus     SCHEDULED COMPLETED CANCELLED
EligibilityType     CSC PRC BAR OTHER
PlantillaStatus     VACANT FILLED FROZEN ARCHIVED
VacancyStatus       DRAFT PUBLISHED OPEN CLOSED FILLED CANCELLED
```

### Frontend
Pages: Recruitment funnel (`Recruitment.jsx`) replaces standalone `Interviews.jsx`/`Vacancy.jsx` (both now redirect into the funnel); `Appointments.jsx`, `Plantilla.jsx`, `Designation.jsx`, `Disqualifications.jsx` still standalone. Routes in `App.jsx`; `/vacancy` and `/interviews` redirect to `/recruitment?tab=...`. Sidebar RSP group at `Sidebar.jsx:41-49` (funnel entry only). Secondary consumers: `UserDashboard`, `useNotifications`.

## 2. Verified findings — backend

### Critical (broken features / release-blockers)
~~1. **Hire path writes invalid enums → 500.** `repositories/recruitmentRepository.js:75,83` creates `Appointment` with `type:'REGULAR'` and `status:'ACTIVE'`; neither exists in `AppointmentType`/`AppointmentStatus` (verified above). Mixed with a vacancy+plantilla item it always 500s. `contracts/recruitment.js:61` default `appointmentType:'REGULAR'` feeds it. (`REGULAR` is valid in the *loan* world, not appointments.)~~ — FIXED P1 (rewritten hire service, rewritten interviews, eligibility enum corrected, plantilla status fixed).
~~2. **Hire plantilla fill is unscoped + unconditional → cross-tenant write + double-fill.** `recruitmentRepository.js:86-89`: `prisma.plantillaItem.update({ where:{ id: plantillaItemId } })` — no `withTenant(req)`, no `status==='VACANT'` precondition. Two hires against one vacancy both mark the item FILLED.~~ — FIXED P1 (rewritten hire service, rewritten interviews, eligibility enum corrected, plantilla status fixed).
~~3. **Hire is non-transactional → partial writes.** `recruitmentRepository.js:54-98` runs employee create → appointment create → plantilla update → applicant update as separate awaited writes. Failure mid-chain leaves an orphan `Employee` with the applicant still un-HIRED.~~ — FIXED P1 (rewritten hire service, rewritten interviews, eligibility enum corrected, plantilla status fixed).
~~4. **Interviews create/update 100% broken.** `contracts/interviews.js:23-25` validates `interviewers`/`score`/`recommendation`; the `Interview` model has no such columns → every save that includes them (the UI always does) throws a Prisma unknown-argument error → 500. `NO_SHOW` (:21) is not in `InterviewStatus` → 500. Frontend sends `recommendation:''` by default → fails enum → 400 even when other fields are fine.~~ — FIXED P1 (rewritten hire service, rewritten interviews, eligibility enum corrected, plantilla status fixed).
~~5. **Eligibility enum drift → 500/400.** `contracts/recruitment.js:78` `CSE|CSE_2|CESO|PRC|OTHER` vs DB `CSC|PRC|BAR|OTHER`. Any real RSP use (CS exam) fails.~~ — FIXED P1 (rewritten hire service, rewritten interviews, eligibility enum corrected, plantilla status fixed).
~~6. **Plantilla `ABOLISHED` not in DB.** `contracts/plantilla.js:23` vs `PlantillaStatus` (VACANT/FILLED/FROZEN/ARCHIVED) → POSTing it 500s.~~ — FIXED P1 (rewritten hire service, rewritten interviews, eligibility enum corrected, plantilla status fixed).

### High
~~7. **No tenant FK asserts on creates** (`plantillaItemId`, `vacancyId`, `applicantId`, `employeeId`, `positionId`, `departmentId`): `vacancyRepository.js:22-24`, `recruitmentRepository.js:20,25-27,37`, `interviewRepository.js:27-31`, `designationRepository.js:13`, `vacancyPublicationRepository.js:15-19`. P2003 catches nothing (the row exists, just in another tenant) → cross-tenant reference pollution. Only `appointmentsService.create` asserts employee-in-tenant correctly.~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
~~8. **`PATCH /appointments/:id` broken via `itemNo`.** `appointmentsService.js:36-39` maps nothing; repo writes raw `data` (`appointmentsRepository.js:23`); column is `itemNumber`. Contract exposes `itemNo`. UI has no edit button → latent, API-visible 500.~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
~~9. **`appointmentsRepository.update` skips `stampTenant`** (:23) though create stamps — inconsistent with tenant hygiene (where-is scoped, so row-moves blocked; still wrong on principle).~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
10. **`findActive` treats unexpired/non-null validity as "active" without `isBarred`.** `disqualificationRepository.js:107-119` → non-barred records surface in the active DIBAR list (Compliance & Audit "Current disqualified"). — FOLLOW-UP (not in P1; DIBAR isBarred filter remains). 
~~11. **`GET /disqualifications` + `/active` unvalidated + unbounded limit.** `routes/disqualifications.js:9,11` → raw `req.query`, `parseInt(…)\|\|50` no cap (`disqualificationController.js:6-13`).~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
~~12. **Free-string enum-like query params → 500 instead of 400.** `status=BOGUS` passes `z.string()` in vacancy/recruitment/plantilla/interviews/designation list schemas, then Prisma enum validation fault → generic 500 (PrismaClientValidationError has no `P2xxx` code). `server.js` only normalizes `P2\d{3}`.~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
~~13. **Dates as raw strings (no UTC broker).** `scheduledAt` (interviews), `publishedAt/closesAt` (vacancy), `issuedDate/effectiveDate/expirationDate` (designation), hire `birthDate/startDate`: `new Date(...).toISOString()` on garbage → RangeError → 500. Only `appointmentsService.toUtcDate` does it right.~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
~~14. **Hire salary-0 employees.** `monthlySalary: data.monthlySalary ?? 0`; frontend `hireApplicant(id)` sends **no body** → every hired employee lands at ₱0 (hits payroll immediately: allowance/tax math off; `PAYROLL.md` treats `monthlySalary` as source of truth).~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).
~~15. **Global `@unique` on `PlantillaItem.itemNumber` + `DesignationOrder.orderNumber`** (`schema.prisma:656,716`) → cross-tenant P2002→409; should be `@@unique([tenantId, itemNumber])`.~~ — FIXED P1 (assert helper, itemNo mapping, stampTenant added, page/limit clamps, z.enum schemas, date coercion, salary default, composite unique migration).

### Medium / dead
- `recruitmentController.js:2` unused `z` import.
- `GET /appointments` returns bare array (`appointmentsController.js:7`) — no pagination, page/limit contract absent (1k-scale concern).
- `GET /designation` gated behind the **write** capability `appointmentsCRUD` — read-only role can't view orders; no DIBAR read-only capability either.
- `CAPABILITY_ROUTES` doc-entry drift (`permissions.js:32-45`) lists `employeeRecordsCRUD` as only `/employees`+sections — misses `/plantilla`, `/designation`, `/recruitment`, `/interviews`, `/vacancy`.
- **`DEPT_HEAD` has `employeeRecordsCRUD`** (`permissions.js:127`) → can create/delete *plantilla items* (housing both `status` and money-ish fields); likely unintended vs all other RSP caps (HR_MANAGER/ADMIN only).
- No Vacancy/Applicant/Interview/Appointment/Designation/Disqualification seed fixtures (`prisma/seed.js:515-536` seeds plantilla only) → RSP pages empty on re-seed.
- Hire never consults `Disqualification`; no applicant-scoped DIBAR (model is Employee-only) → barred persons can be hired.
- Soft vs hard delete mix: appointments soft (`deletedAt:null` filtered), everything else hard-deletes.

## 3. Verified findings — frontend

### Critical
~~- **Interviews page cannot even list.** `Interviews.jsx:36` `interviewsApi.list().then(r => r.data)` then `: 36-38 const { data } = …` → destructure undefined → TypeError → caught/toasted; `it.interviewers/score/recommendation` rendered (:55-57,171-172) from columns that can't exist. Save path sends the contract-invalid fields → 500. Applicant field is a raw UUID box (:209) — no picker.~~ — FIXED P1 (Interviews.jsx rewritten; now lives inside Recruitment funnel Interviews tab).
~~- **Recruitment kanban drops valid statuses.** Columns `NEW,SCREENED,SHORTLISTED,INTERVIEWED,OFFERED,HIRED` (Recruitment.jsx:216-223); `APPLIED` selectable (:12) but has no column → cards vanish; `REJECTED/DISQUALIFIED` also unrenderable.~~ — FIXED P1 (kanban replaced with funnel strip + master-detail pane; all statuses represented).
~~- **Designation page broken against the new enum.** Page uses `ACTIVE/SUSPENDED/REVOKED` (Designation.jsx:9-13) — DB is `DRAFT/RECOMMENDED/APPROVED/ISSUED/EFFECTIVE/REVOKED`; summary cards count dead statuses → always 0; statusFilter never rendered; Remove button `onClick={()=>{}}` (:128); `employeeId` posts human strings ("EMP-001" style) → FK violation 400.~~ — FIXED P1 (Designation.jsx fully rewritten; statuses/DRAFT…REVOKED, employee picker via listEmployees, wired Remove + ConfirmDialog, Effective/Pending cards).
~~- **Plantilla "New Item" modal has no submit button** (`Plantilla.jsx:131-177`) → create impossible in UI.~~ FIXED P1 (modal footer + `id="pi-form"` submit button added; dead search removed).

### High
~~- **Headless search boxes everywhere:** Vacancy (state never set, dropped from api), Plantilla (dropped server-side), Designation (never passed) — all no-ops that still spam `load()`.~~ FIXED P1 (dead search states removed from Vacancy/Designation; Plantilla search wired to backend via `search` query param).
~~- **Recruitment score inputs stutter:** `value={a.eligibilityScore||''}` (0 renders blank), per-keystroke PATCH, no refetch, `catch {}` swallows (`:244`).~~ — FIXED P1 (replaced with funnel ApplicantPane; single Save button, no per-keystroke PATCH).
~~- **Disqualifications double-fetch on filter change** (:81-84): `setPage(1)` + synchronous `fetchRecords()` with stale closure + `useEffect([page])` refire → racy duplicate requests.~~ FIXED P1 (double-fetch resolved via `appliedSearch` + effect deps `[page,statusFilter,typeFilter,reasonFilter,appliedSearch]`; CSV now has header/quoted fields/BOM/Manila-dated filename; shared ConfirmDialog used).
~~- **`api/vacancyPublications.js` dead AND broken** (literal `/vacancy/:vacancyId/publications` placeholder, zero consumers) — publication flow has no UI at all.~~ — DELETED P1 (module removed; zero consumers).

### Orphans / parity
~~- **Interviews has NO Sidebar entry** (RSP group `Sidebar.jsx:41-49`) and no CommandPalette entry → unreachable via nav.~~ — FIXED P1 (funnel unified under single Recruitment sidebar entry; `/interviews` redirects into funnel).
~~- **Capability-blind routes:** `/plantilla`, `/vacancy`, `/designation`, `/disqualifications` carry no `capability` prop (App.jsx) → custom roles granted those caps can't open pages even though backend allows (matrix parity broken).~~ — FIXED P1 (capability props added: `/plantilla` employeeRecordsCRUD, `/vacancy`+`/designation`+`/disqualifications` proper caps).
~~- `/appointments` UI gate uses `appointmentsCRUD` but backend GET needs `appointmentsRead` → a read-only custom role is blocked.~~ — DOCUMENTED (no seeded read-only role; read-only view is P2 follow-up per AGENTS).
~~- 201-file Eligibility (CSC/PRC etc.) has **no UI** — `/recruitment/eligibilities` API is writable but nothing surfaces it; applicant `eligibilityScore` is a manual int.~~ — FIXED P1 (Eligibility block in funnel ApplicantPane: pre-hire score editor + post-hire CSC/PRC eligibility list via `listEligibilities`).

## 4. CSC / PRIME-HRM alignment

| PRIME-HRM ER | Standing | What's missing to call Ready |
|---|---|---|
| 201 File / appointments / plantilla | 🟢 plantilla register CRUD; appointments create; 201 section data | – |
| Vacancy posting & publication trail | Vacancy + publication history (date posted) | `/recruitment` → Vacancies tab (`Vacancy`, create/list/close wired) | 🟡 | RSP → Recruitment → Vacancies tab; VacancyPublication model real; publication-history UI still missing |
| Applicant intake → hiring | 🟢 intake + hiring wired in Recruitment funnel (stage strip, Hire modal, idempotent) | DIBAR pre-hire check; offer-letter print |
| MSB screening & interview evidence | 🟢 screening scores + board notes in applicant pane; interviews CRUD in funnel | MSB minutes artifact; panel/score columns (if required) |
| Eligibility as selection gate | 🟢 enum aligned (CSC/PRC/BAR/OTHER); pre-hire score + post-hire block in funnel; 201 Eligibility tab | Eligibility-vs-vacancy auto-match |
| DIBAR discipline | 🟡 active-list + CSV export wired; `isBarred` ignored (follow-up); applicant-scoped DIBAR not yet modeled | `isBarred` filter; applicant watchlist |
| ORA-OhRA / CSC Form 33 artifacts | 🔴 `oraohraReference/cscFormNo/documentUrl` columns unused | Printer + reference capture (join form-printers gap) |
| Audit trail & tenant integrity | 🟢 full global audit; all RSP repos scoped + transactional hire + assert helper | — |

## 5. Hardening plan (proposed)

**P1 — correctness / release-blockers (backend): IMPLEMENTED**
Hire rewrote transactional + enum-safe; interviews contract+page rewritten; tenant assert helper added; appointmentsService+repo patched; date coercion; eligibility enum aligned; plantilla status fixed; disqualification list validated; composite uniques added; frontend: Recruitment funnel, Interviews rewritten, Designation rewritten, Plantilla submit wired, Disqualifications CSV fixed, Vacancy dead search removed, Sidebar/CommandPalette unified.

Remaining P2 follow-ups (tracked in TODOS.md): `findActive` `isBarred` filter; applicant-scoped DIBAR; vacancy auto-close at `closesAt`; MSB minutes artifact; offer-letter / CSC Form 33 print; designation print; seed fixtures.

**P2 — workflow depth:** DIBAR pre-hire gate + applicant watchlist; vacancy status state machine + publication UI; MSB minutes/panel records; appointment form-number generator + CSC Form 33 print; designation order-number generator + print; plantilla register export; seed fixtures for RSP so pages aren't empty.

**P3 — UI polish/parity:** interviews Sidebar entry; capability props on plantilla/vacancy/designation/disqualifications routes; `/appointments` gate `appointmentsRead`; designation page enum + picker + Remove wiring; plantilla modal submit + server `search`; shared CSV exporter; pagination on `/appointments`; `DEPT_HEAD` plantilla cap decision (defaults vs whitelist).

## 6. Follow-ups
- Update `src/docs/PRIME_HRM_EVIDENCE.md` RSP pillar statuses after P1 lands (recruitment selection rows flip 🟡→🟢 where artifacts become generatable).
- Hire default salary needs a source of truth: either required-in-form (not `?? 0`) or default from `PlantillaItem.authorizedSalary`.
- Decide `DEPT_HEAD.employeeRecordsCRUD` vs a new `plantillaCRUD` capability (AGENTS `CAPABILITY_ROUTES` drift noted).