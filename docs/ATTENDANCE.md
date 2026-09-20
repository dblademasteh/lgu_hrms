# Attendance System — LGU HRMS

One document for how daily time records (DTR) work across the whole system: punch
lifecycle, timezone rules, rule-driven schedule, payroll tie-in, the surfaces that
call it, and known follow-ups.

## Surfaces

| Surface | Path | Auth |
| --- | --- | --- |
| Employee self-service punch + history | `POST /attendance/punch`, `GET /attendance/my`, `GET /attendance/my/history` | any linked employee (JWT) |
| ESS dashboards | `GET /ess/attendance?month=` | linked employee (self-scoped) |
| Self-service portal | moved to `lgu-attendance` project (`/my-attendance`) | any linked employee (JWT) |
| Standalone lobby kiosk | `/kiosk/` in `kiosk/` | **none** (public punch API + optional punch key) |
| HR management list/create/edit/delete/import | `GET|POST /attendance`, `PATCH|DELETE /attendance/:id`, `POST /attendance/import` | role-gated (see matrix) |
| Public terminal punch | `POST /attendance/public-punch/punch` | none / `punchKey` if configured |

Both the kiosk and the standalone `lgu-attendance` self-service portal are wired to real endpoints — no mocks.

## Data model

**`Attendance`** (`prisma/schema.prisma`)

| Field | Type | Notes |
| --- | --- | --- |
| `date` | `DateTime @db.Date` | **Manila calendar date** stored as that date's UTC-midnight label (`dateKeyToUtc`). Only the date label matters; the instant is always `T00:00:00Z`. |
| `timeIn` / `timeOut` | `DateTime @db.Timestamptz(6)` | UTC instants; displayed in Asia/Manila. |
| `hours` | `Float?` | Worked hours. Computed at punch-out (net of lunch); free-form on import/manual. |
| `remark` | `String?` | `On time` / `Tardiness` / `Overtime` / `On leave` / `Completed` / free-text. |
| `employeeId`, `tenantId` | | Tenant-scoped on every query/write (`withTenant` / `stampTenant`). |

Index: `@@index([tenantId, employeeId, date])`.

**`AttendanceRule`**

| Field | Meaning | Default |
| --- | --- | --- |
| `name`, `active` | rule label / on/off | |
| `tardinessMin` | grace minutes after shift start before a punch is lateness | |
| `deductionRate` | per-late-day payroll deduction (Decimal) | |
| `workStartMins` / `workEndMins` | shift bounds as minutes since Manila midnight | `480` (08:00) / `1020` (17:00) |
| `lunchStartMins` / `lunchEndMins` | unpaid lunch window | `720` (12:00) / `780` (13:00) |

Migrated via `20260915062353_attendance_rule_schedule`. Rules are tenant-scoped and
`getActiveRule()` takes the first `active: true` row.

## Time handling — the rules that every change must follow

All clock math lives in `backend/src/lib/time.js`:

- `manilaDateKey(dt)` — `YYYY-MM-DD` **as seen in Asia/Manila** (UTC+8, no DST).
  Never derive "today" via `toISOString().slice(0,10)` — that is the UTC day and is
  a day behind PH after 08:00 UTC.
- `dateKeyToUtc(key | dt)` — the canonical `@db.Date` value: `key T00:00:00.000Z`.
- `endOfDateKeyExclusive(key)` — exclusive end of a Manila-labeled day.
- `manilaMinutes(dt)` — minutes since midnight Asia/Manila (used for lateness and
  shift math).
- `manilaTimeOnDate(key, h, m, s)` — instant for local Manila time on a date key.
- `normalizeTimeField(v, dateKey)` — accepts ISO-8601 **or** `HH:MM(:ss)`.

Use these rather than `new Date('YYYY-MM-DD')` / `setHours` in attendance code —
they are the difference between a correct 08:00 and a DST/UTC-off-shift ghost punch.

## Punch lifecycle

A day is one or more `Attendance` rows for the same employee + `date`. Punching
keys off the **open** row (has `timeIn`, no `timeOut`):

```
             Manila "today" = { dates where date >= dateKeyToUtc(todayKey)
                                 and date <  endOfDateKeyExclusive(todayKey) }
                                        │
   Punch IN ── open row exists? ── yes ─▶ "Already punched in" (200, same row)
              │
              no ──▶ create NEW row (date, timeIn=now); remark ← leave ▶ rule
   Punch OUT ── open row exists? ── no ─▶ 400 PUNCH_CONFLICT
                                           ("Must punch in first" if no rows today,
                                            "Already punched out" otherwise)
              │
              yes ──▶ close it: timeOut=now
                      hours = (out − in) minus the lunch overlap inside the span
                      remark = Completed
```

- **Multi-punch**: after every punch-out, the next IN opens a **new** row — a
  split-shift day is just N rows. Single-row "edit the same row" is gone by design.
- **Hours**: `computePunchHours` in `attendanceService` = elapsed Manila minutes
  minus the portion of `[lunchStart, lunchEnd)` that falls between in/out, /60.
- **Remarks** (`computeRemarkFromRules`): late if `manilaMinutes(timeIn) −
  workStartMins > tardinessMin`; otherwise `Overtime` if worked exceeds the
  scheduled shift (end − start − lunch), else `On time`. `autoMarkLeave` wins over
  the rule when an APPROVED leave overlaps that date (`On leave`).
- Field-validation edge cases are hard 400s (never Swiss-cheese 200s): future dates
  rejected, `hours` clamped to 0–24.

## Endpoint matrix (backend)

| Route | Handler | Guests | Notes |
| --- | --- | --- | --- |
| `GET /attendance` | list | ADMIN, HR_MANAGER, DEPARTMENT_HEAD | DEPARTMENT_HEAD scoped to own dept (`attendanceRepository.findAll`) |
| `POST /attendance` | create | ADMIN, HR_MANAGER, DEPARTMENT_HEAD | dept-scope enforced in repo; `HH:MM` times accepted |
| `PATCH /attendance/:id` | update | ADMIN, HR_MANAGER, DEPARTMENT_HEAD | dept-scope enforced; remark recomputed when only times change |
| `DELETE /attendance/:id` | remove | ADMIN, HR_MANAGER | hard delete — see follow-ups |
| `POST /attendance/import` | bulkImport | ADMIN, HR_MANAGER | upsert by `employeeNumber + date`; per-row error results |
| `GET /attendance/my` | self history | any linked employee | month window `YYYY-MM` |
| `GET /attendance/today` | self today | any linked employee | returns the **first** row of the Manila day |
| `POST /attendance/punch` | self punch | any linked employee | routes to `biometricPunch` |
| `POST /attendance/public-punch/punch` | kiosk punch | none | `punchLimiter` 120/min/IP; `punchKey` checked when `BIOMETRIC_PUNCH_KEY` set; `tenantCode` case-insensitive |
| `GET /ess/attendance` | ESS history | linked employee | self-scoped, month window |

Punch responses include `record.employee` (`firstName`, `lastName`,
`employeeNumber`) so kiosk/portal screens can show a name confirmation.

Protected routes sit behind the global `requireAuth` + audit mount; the public punch
is registered **before** that mount in `routes/index.js`.

## Payroll tie-in (`payrollEngine.js`)

During run generation the engine tallies late days per employee from the period's
`Attendance.timeIn` using the **active** rule's `workStartMins` + `tardinessMin`
(fallback 08:00) and emits an `ATTD-<name>` deduction line at `deductionRate` per
late day. It imports `manilaMinutes` from `lib/time.js` — keep it that way (do not
inline offsets in the engine). Attendance does not yet feed absence/overtime pay or
proration; see follow-ups.

## Frontends

1. **Attendance Portal** (`frontend/src/pages/AttendancePortal.jsx`) — logged-in
   page: Today's Status (first row of today), Punch In/Out (multi-punch aware — a
   post-`OUT` IN is labelled "Punch In (New)"), monthly summary + history, kiosk
   toggle (debug/ops), and biometric credential enrolment.
2. **ESS** — `/ess/attendance` monthly read-only list for the linked employee.
3. **Kiosk** (`kiosk/`, see `docs/KIOSK.md`) — login-less lobby terminal; punch key
   held in memory for the session; confirmation shows name + time + today's hours.

## Gotchas & conventions

- `timeIn`/`timeOut` are UTC instants; only ever **display** them converted to
  Asia/Manila (`toLocaleTimeString`, `Intl` `timeZone: 'Asia/Manila'`).
- The `@db.Date` value is the Manila-date label (UTC-midnight of that label); never
  feed shifted midnights into `date` queries.
- Never let bare JS `new Date('HH:MM')` parse in import/manual paths —
  `normalizeTimeField` exists for that.
- Every attendance query carries `withTenant`; every write `stampTenant`.
- DEPARTMENT_HEAD scoping lives in the repository (list/create/update/remove), so
  controllers stay thin.
- PUNCH_CONFLICT (400) is the contract for invalid punch transitions; the Portal
  and kiosk both toast/message it — don't turn boundary edges into 500s.

## Punch hardening (pass — Sep 2026)

Applied after the portal deep-dive; targets concurrency, data integrity, and
boundary edges.

- **`punchTransition` runs in a Serializable transaction** with one P2028 retry.
  IN/OUT/device punches race against each other server-side; the conditional
  `updateMany({ timeOut: null })` on OUT means a parallel OUT can never close the
  same row twice (second wins the check and returns 400 `PUNCH_CONFLICT` instead of
  silently "succeeding"). **Verified live**: 3 parallel INs → 1 "Punched in", 2
  "Already punched in", exactly one open row; 2 parallel OUTs → 1 success + 400.
- **Punch-IN remark preserved on OUT.** `computePunchOutRemark` re-derives the
  remark from rules on punch-out instead of overwriting with a static
  "Completed". A tardy IN now stays "Tardiness" through OUT.
- **All attendance writes create rows with `source: 'MANUAL'`** (manual create)
  and punches/device/import keep their provenance (`PUNCH`/`DEVICE`/`IMPORT`).
- **`GET /attendance/today` returns the open/latest row** (`orderBy timeIn desc`)
  so multi-punch days always surface the current session, not the first punch.
- **Boundary inputs are 400s, not 500s**:
  - `timeField` refined with `validClock` — `25:99` → `VALIDATION_ERROR`
    (was a 500 via `setUTCHours` overflow). `HH:MM(:ss)` or ISO-8601 only.
  - `date` on `GET /attendance` validated `YYYY-MM-DD` (query schema
    `listAttendanceSchema`); `month` on `GET /attendance/my` validated `YYYY-MM`
    (query schema `myAttendanceSchema`) — both wired via `validate()` in
    `routes/attendance.js`.
  - Future-date punches → `AppError` 400 `FUTURE_DATE`; invalid transitions →
    400 `PUNCH_CONFLICT`; non-scoped dept punches → 403 `FORBIDDEN`
    (`AppError` from `lib/errors.js`, never bare `Error` → 500).
- **deviceSync ingest no longer aborts the batch** on one failure: failed applies
  stay `applied: false` and are retried next sync; per-key dedupe map avoids
  `findMany` per row.

## Follow-ups (tracked in `TODOS.md`)

- `DELETE /attendance` is a hard delete — AGENTS prefers soft (`deletedAt`).
- AttendanceRule schedule fields have no create/manage UI yet.
- `biometricService.verify` is a stub (`valid: true`) — the WebAuthn flow that
  turns a fingerprint assertion into a punch is future work.
- No absence/overtime payfeed, no proration, ESS month window uses UTC month bounds.