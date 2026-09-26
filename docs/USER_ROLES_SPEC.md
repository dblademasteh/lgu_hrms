# Users & Roles — Reverse Specification

Reverse-engineered from the implementation. Every requirement below cites the code
that was observed. Statements are marked:

- **[OBS]** observed directly in code
- **[INF]** inferred from code behaviour, not stated in code
- **[GAP]** observed absence or contradiction

Source of truth for behaviour is the code, not this document.

Scope: user administration, role administration, the capability/permission matrix,
and the User↔Employee linkage that gates ESS access.

---

## 1. Technology Stack

| Layer | Choice | Evidence |
|---|---|---|
| Runtime | Node.js, ESM | `backend/package.json` (`"type": "module"`) |
| Framework | Express 5 | `backend/src/routes/index.js` |
| ORM | Prisma 5.22.0 | `npx prisma --version` |
| DB | PostgreSQL 16 (shared-schema multi-tenant) | `docker-compose.yml` |
| Validation | Zod | `backend/src/shared/contracts/users.js` |
| Auth | JWT access + refresh rotation, bcrypt (cost 12) | `backend/src/services/usersService.js:74` |
| Frontend | React 19 + Vite, plain JS | `frontend/src/pages/Users.jsx` |

## 2. Module Structure

One concern per layer, as the project guide requires:

| Concern | File |
|---|---|
| HTTP + validation | `backend/src/routes/users.js`, `backend/src/routes/roles.js` |
| Contracts | `backend/src/shared/contracts/users.js`; inline Zod in `routes/roles.js:20-23,107-109` |
| Business logic | `backend/src/services/usersService.js`, `backend/src/services/permissionService.js` |
| Queries | `backend/src/repositories/userRepository.js` |
| HTTP shaping | `backend/src/controllers/usersController.js` (thin — delegates only) |
| Capability catalog | `backend/src/shared/permissions.js` |
| Gate middleware | `backend/src/middleware/permission.js`, `backend/src/middleware/rbac.js` |
| UI | `frontend/src/pages/Users.jsx` (4 tabs) |

**[OBS]** `roles.js` contains Prisma queries inline rather than delegating to a
repository/service, unlike the `/users` path. Inconsistent layering (see §9).

## 3. Data Model

### 3.1 `User` — authentication & authorization

| Field | Notes | Evidence |
|---|---|---|
| `id` | UUID | schema |
| `username` | unique login id | `contracts/users.js:5` |
| `passwordHash` | bcrypt, cost 12 | `usersService.js:74` |
| `pinHash` | nullable; PIN quick-login | `usersService.js:16` |
| `role` | **String, not enum** — permits custom roles | `contracts/users.js:6` |
| `departmentId` | nullable; department scope | `contracts/users.js:7` |
| `externalId` | soft link → `Employee.employeeNumber` | `usersService.js:24-26` |
| `status` | `ACTIVE` / `INACTIVE` (uppercase, contract-enforced) | `contracts/users.js:12` |
| `tenantId` | tenant scope | `middleware/tenant.js` |

**[OBS]** No password, PIN, or 2FA secret is ever returned: `usersService.list`
strips `passwordHash`/`pinHash` (`:16`) and exposes only a derived
`pinEnabled` boolean. `create`/`update` strip both (`:78,100`).

### 3.2 `Role`

`id`, `name`, `description?`, `isSystem`, `tenantId`, timestamps. Unique per
`[name, tenantId]`. **[OBS]** `isSystem` blocks deletion (`routes/roles.js:97-99`).

### 3.3 `RolePermission`

`roleId` + `key` + `allowed` + `tenantId`, unique on `[roleId, key]`
(`permissionService.js:78`).

### 3.4 User ↔ Employee linkage

**[OBS]** `User.externalId = Employee.employeeNumber`, resolved through the
`linkedEmployee` relation (`userRepository.js:10`, `usersService.js:76`).

---

## 4. Observed Requirements (EARS)

### 4.1 Authentication prerequisite

| # | Requirement | Evidence |
|---|---|---|
| U-AUTH-1 | The API shall reject unauthenticated requests to all `/users` and `/roles` routes. | `routes/index.js:64` mounts `requireAuth` globally before both routers (`:70,74`) |
| U-AUTH-2 | Where a request carries no resolvable tenant, the system shall reject user and role writes with 400 `TENANT_REQUIRED`. | `usersService.js:66-68, 83-85` |

### 4.2 Capability gate

| # | Requirement | Evidence |
|---|---|---|
| U-GATE-1 | The system shall require the `manageUsersAndRoles` capability for all `/users` routes. | `routes/users.js:11` |
| U-GATE-2 | The system shall require the `manageUsersAndRoles` capability for all `/roles` routes **except** `GET /roles/my-permissions`. | `routes/roles.js:13-18` precedes the gate at `:26` |
| U-GATE-3 | When a caller's role is `SUPER_ADMIN`, the system shall bypass the capability gate. | `middleware/permission.js:14` |
| U-GATE-4 | When a caller lacks the capability, the system shall respond 403 `FORBIDDEN`. | `middleware/permission.js:18` |

### 4.3 Effective permission resolution

| # | Requirement | Evidence |
|---|---|---|
| U-PERM-1 | The system shall compute a role's effective permissions as `DEFAULT_PERMISSIONS[role]` overlaid with explicit `RolePermission` rows, where a row overrides the default. | `permissionService.js:17-21` |
| U-PERM-2 | Where a role name is absent from `DEFAULT_PERMISSIONS` and has no rows, the system shall resolve an empty permission map (fail closed). | `permissionService.js:18` (`?? {}`) |
| U-PERM-3 | Where `permissions` contains a key not in the capability catalog, the system shall reject with 400 `INVALID_CAPABILITY`. | `permissionService.js:70-74` |
| U-PERM-4 | Where a role does not exist for the tenant, the system shall reject with 400 `INVALID_ROLE`. | `permissionService.js:63-65` |
| U-PERM-5 | Where an empty permission map is submitted, the system shall return an empty map without writing. | `permissionService.js:67-69` |
| U-PERM-6 | `GET /roles/my-permissions` shall require no capability and shall return only the caller's own effective map. | `routes/roles.js:13-18` |

**[INF]** U-PERM-1 is why a role holding *some* `RolePermission` rows does not
lose every capability absent from those rows: seeded roles keep the default
baseline for capabilities nobody has explicitly touched.

### 4.4 Creating a user — **the flow in question**

Ordered exactly as `usersService.create` (`:65-80`) executes.

| # | Requirement | Evidence |
|---|---|---|
| U-CREATE-1 | When `tenantId` is absent, the system shall reject with 400 `TENANT_REQUIRED`. | `usersService.js:66-68` |
| U-CREATE-2 | When `externalId` is supplied, the system shall verify a matching Employee exists with `deletedAt: null` and `status: 'ACTIVE'` in the same tenant; otherwise reject 400 `INVALID_LINK`. | `usersService.js:24-30` |
| U-CREATE-3 | When the linked Employee has no `keyPosition`, the system shall reject 400 `NOT_KEY_POSITION`. | `usersService.js:31-33` |
| U-CREATE-4 | When another user in the tenant already links the same `externalId`, the system shall reject 409 `LINK_TAKEN`. | `usersService.js:34-40` |
| U-CREATE-5 | The system shall verify `role` exists as a `Role` row in the tenant; otherwise reject 400 `INVALID_ROLE`. | `usersService.js:43-52, 71` |
| U-CREATE-6 | The system shall verify `departmentId` exists in the tenant; otherwise reject 400 `INVALID_DEPARTMENT`. | `usersService.js:54-63, 72` |
| U-CREATE-7 | The system shall generate a random 12-character password from a 62-symbol alphabet and store it bcrypt-hashed at cost 12. | `usersService.js:7-10, 73-74` |
| U-CREATE-8 | The system shall return the created user **including the plaintext `temporaryPassword`**, which is the only time it is available. | `usersService.js:79` |
| U-CREATE-9 | The system shall stamp `tenantId` on the new row. | `usersService.js:75` → `stampTenant` |
| U-CREATE-10 | The response shall omit `passwordHash` and `pinHash`. | `usersService.js:78` |
| U-CREATE-11 | Where `externalId` is supplied, the system shall persist the link by writing the `externalId` scalar, never a nested `linkedEmployee` relation write, because the latter conflicts with the unchecked scalar FKs added by `stampTenant`. | `usersService.js:75-82`; see §5.2 |

**[OBS] U-CREATE-3 is a deliberate policy, not an oversight**: only employees
tagged with a key position (`Mayor`, `HRMO`, …) may hold a login, so ESS cannot be
used by arbitrary staff. The tag is set on `Employee.keyPosition`
(`Users.jsx` employee form). U-CREATE-2/U-CREATE-3 compose: a valid *active* but
untagged employee yields `NOT_KEY_POSITION`, not `INVALID_LINK`.

**[OBS]** `assertLinkable` returns early when `externalId` is falsy
(`usersService.js:23`), so `null`/absent linkage is legal — admin and service
accounts exist without employee records.

### 4.5 Updating a user

| # | Requirement | Evidence |
|---|---|---|
| U-UPD-1 | The system shall never write `passwordHash`, `pinHash`, or `tenantId` from the request body. | `usersService.js:86` destructures them out |
| U-UPD-2 | When `externalId` is present in the body, the system shall treat `""`/whitespace as "unlink" and issue a `disconnect`. | `usersService.js:87-94` |
| U-UPD-3 | When the target user is not in the caller's tenant, the system shall respond 404. | `usersService.js:97-98` |
| U-UPD-4 | The system shall re-validate role and department on every change, not only on create. | `usersService.js:95-96` |

### 4.6 Roles

| # | Requirement | Evidence |
|---|---|---|
| U-ROLE-1 | When creating a role whose name already exists in the tenant, the system shall reject 400 `VALIDATION_ERROR`. | `routes/roles.js:56-61` |
| U-ROLE-2 | The system shall create custom roles with no capabilities; access is granted only via the matrix. | `routes/roles.js:62` comment |
| U-ROLE-3 | When patching a role, the system shall ignore any `name` in the body — role identity is the path param and is immutable. | `routes/roles.js:71-83` (only `description` is read) |
| U-ROLE-4 | When deleting a role with `isSystem: true`, the system shall reject 400 `VALIDATION_ERROR`. | `routes/roles.js:97-99` |
| U-ROLE-5 | The system shall scope every role query by tenant. | `routes/roles.js:31, 57, 75, 91` via `withTenant` |

**[GAP] U-ROLE-4 has no counterpart for permission edits.** A system role's
capability set is fully mutable through `PATCH /roles/:name/permissions`
(`routes/roles.js:106-116`), which does not consult `isSystem`. An admin can
therefore strip `manageUsersAndRoles` from their own role, immediately losing
access to the matrix that would let them restore it. Recovery requires another
holder of the capability or a `SUPER_ADMIN`.

### 4.7 Auditing

| # | Requirement | Evidence |
|---|---|---|
| U-AUDIT-1 | Every mutating `/users` and `/roles` request shall be written to `AuditLog` exactly once by the global mount. | `routes/index.js:66`; no per-route audit calls exist in either router |
| U-AUDIT-2 | The audit body shall exclude `password` and `temporaryPassword`. | `middleware/audit.js:85` |
| U-AUDIT-3 | The audit `action` and `entity` shall be derived from `req.originalUrl`, so a successful write and a failed write on the same endpoint record the same endpoint. | `middleware/audit.js:10-27`; see §5.3 |

This resolves the older analysis doc's "Issue 3: No Audit Trail for Role Changes"
— role changes **are** audited.

### 4.8 Frontend

| # | Requirement | Evidence |
|---|---|---|
| U-UI-1 | The Users page shall expose Users, Roles, and Permissions Matrix tabs, plus a Tenants tab visible only to `SUPER_ADMIN`. | `Users.jsx:65-70` |
| U-UI-2 | The page shall show edit controls only when the caller holds `manageUsersAndRoles` (or is `SUPER_ADMIN`). | `Users.jsx:24` |
| U-UI-3 | The page shall read the capability list and matrix from the API, with no localStorage override. | `Users.jsx:129-130`; `config/permissions.js` |
| U-UI-4 | When a role has unsaved matrix edits, the system shall track it dirty and persist only changed roles. | `Users.jsx:93-101` |
| U-UI-5 | The page shall show the generated `temporaryPassword` after creation, because it is not recoverable later. | `Users.jsx:179-181` |
| U-UI-6 | While the matrix is in edit mode, capability toggles shall mutate a local draft and not issue a request per toggle. | `Users.jsx:79-91` |

---

## 5. Defects Found and Fixed

All three were confirmed against the running system before and after the change.

### 5.1 Response-shape mismatch — user creation was impossible via the UI

**[GAP] — confirmed against the running system, then fixed.**

`GET /departments` and `GET /users` return a **bare JSON array**; paged endpoints
such as `GET /employees` return `{ items, total, page, limit }`. Eight call sites
read `.data?.items` off the bare array, which is `undefined`, so `?? []` produced
an empty list:

| Call site | Effect |
|---|---|
| `pages/Users.jsx:124` | user table permanently empty |
| `pages/Users.jsx:125` | department `<select>` had only its static `""` option |
| `components/EmployeeForm.jsx:95` | department assignment unavailable |
| `pages/Employees.jsx:109` | department filter empty |
| `pages/Organization.jsx:50` | department tree empty |
| `pages/Appointments.jsx:40` | department filter empty |
| `pages/Recruitment.jsx:105` | department filter empty |
| `pages/Plantilla.jsx:26` | department filter empty |

**Why "add a user" was impossible.** `Users.jsx:166` rejects submission when
`form.departmentId` is falsy, and the only selectable `<option>` was `value=""`
(`Users.jsx:742`, falsy). With `deptList` empty the validation could never be
satisfied, so user creation through the UI was dead regardless of the API.

**Fix.** Normalisation moved to the API boundary so the shape can no longer be
misread:

- `frontend/src/api/shape.js` — new `toArray()` / `listData()` helpers.
- `api/departments.js`, `api/users.js` — `list()` now resolves to an array.
- All eight call sites updated to consume an array directly.
- `DetailPane.jsx:84` and `EmployeeProfileModal.jsx:84` had defensive
  `r?.data ?? r` handling; simplified to match.

Verified against the live API: `GET /users` → `isArray: true`, `length: 6`;
`GET /departments` → bare array; `GET /employees` → `{items:[…]}`. The defect was
in the client, not the server.

### 5.2 Prisma checked/unchecked write conflict — every ESS-linked user creation 500'd

**[GAP] — creating a user with an `externalId` always failed with HTTP 500.**

`usersService.create` built the row as unchecked scalar FKs *plus* a checked
relation in a single `prisma.user.create` call:

```js
const stamped = stampTenant(req, { username, role, departmentId, … });   // scalars
const link = externalId ? { linkedEmployee: { connect: { employeeNumber: externalId } } } : {};
await userRepository.create(req, { ...stamped, ...link });               // + relation
```

Prisma forbids mixing the two input styles in one write — a call carrying
`departmentId`/`tenantId` *and* `linkedEmployee: { connect }` fails with
`Unknown argument 'tenantId'`. Because `stampTenant` always adds `tenantId`, the
failure was unconditional whenever `externalId` was supplied. `assertLinkable`
passed first, so the request validated cleanly and then blew up inside Prisma,
surfacing as `INTERNAL_ERROR`. `usersService.update` carried the same defect via
`linkedEmployee: { connect | disconnect }`.

**Fix.** `externalId` *is* the FK backing `linkedEmployee`
(`schema.prisma:110`), so writing it as a plain scalar yields the identical row
and keeps the write entirely within the unchecked input style:

- `usersService.create` — `externalId` folded into the stamped scalar payload.
- `usersService.update` — sets `rest.externalId = ext || null` instead of a
  nested relation write.

**Verified** by creating a user linked to `EMP-SOLANA-0003`, then logging in as
that user with the returned `temporaryPassword` and reading `GET /ess/profile`,
which returned the correct employee record. The 500s left error rows in
`AuditLog` (`after: { status, error: true }`), which is how the failure was found.

### 5.3 Audit trail recorded the wrong endpoint for successful writes

**[GAP] — the compliance trail could not identify which endpoint a write touched.**

`audit.js` derived `action` from `req.path` and `entity` from `req.baseUrl`.
Express rewrites both as a request descends through mounted routers and restores
them only while unwinding after a throw, so at the moment `res.send` fires they
disagreed **by outcome**:

| Outcome | `action` | `entity` |
|---|---|---|
| Success (201) | `POST /` ❌ | `users` ✅ |
| Failure (4xx/5xx) | `POST /api/v1/users` ✅ | `root` ❌ |

Every *successful* mutation through a sub-router logged a bare `POST /` with no
endpoint, and every *failed* one logged the wrong entity. This is the compliance
record, so the gap is correctness-critical rather than cosmetic — it applies to
every mutating route, not just users.

**Fix.** `audit.js` now derives both fields from `req.originalUrl`, the only URL
Express preserves across the whole lifecycle, with the query string stripped.
`readBefore` already used `originalUrl` for exactly this reason.

**Verified** after the fix: a 201 and a 400 on `POST /api/v1/users` both log
`action: "POST /api/v1/users"`, `entity: "users"`.

---

## 6. Non-Functional Observations

| Area | Observation | Evidence |
|---|---|---|
| Secrets | Plaintext password returned once at creation, hashed at rest, excluded from audit | `usersService.js:73-79`, `audit.js:85` |
| Password strength | 12 chars from a 62-symbol set, but selected with `Math.random()` — **not** a CSPRNG | `usersService.js:7-10` |
| Tenant isolation | Every user/role query scoped by `withTenant`; writes stamped with `stampTenant` | `userRepository.js:6,19,23,27`; `routes/roles.js:31,57,64,75,91` |
| N+1 | `/users` eagerly includes department + linkedEmployee; not paginated | `userRepository.js:5-14` |
| Pagination | `GET /users` returns **all** tenant users unpaged, unlike `/employees` | `usersController.js:5-7` |
| Rate limiting | `apiLimiter` (600/60s) applies to `/api/` | project guide |
| On-premise | Session-establishing auth is IP-gated; user CRUD is not | `middleware/onPremise.js` |

**[INF] Pagination gap.** `/users` is unpaged while `/employees` is paged. At
1,000 employees this returns 1,000 rows with two joined relations per row. The
project guide flags ≥1k scale as a supported posture.

---

## 7. Inferred Acceptance Criteria

A user-creation request is acceptable when:

1. `POST /users` with a valid tenant, existing role, existing department, and
   either no `externalId` or a key-position-tagged unlinked active employee →
   201, body contains `temporaryPassword`, omits `passwordHash`/`pinHash`.
2. Same request with an untagged but active employee → 400 `NOT_KEY_POSITION`.
3. Same request with a `externalId` already linked → 409 `LINK_TAKEN`.
4. Same request with an unknown role → 400 `INVALID_ROLE`.
5. Same request without a tenant → 400 `TENANT_REQUIRED`.
6. Caller lacking `manageUsersAndRoles` → 403 `FORBIDDEN` on every verb.
7. Every accepted mutation produces exactly one `AuditLog` row with no password
   material in `after`, recording the real endpoint path — see §5.3.
8. After creation, the new user appears in `GET /users` for that tenant and in no
   other tenant's list.
9. A user created with an `externalId` can log in with the returned
   `temporaryPassword` and resolve their own record via `GET /ess/profile`.

---

## 8. Uncertainties and Open Questions

1. **`Math.random()` for passwords** (`usersService.js:9`). Is this acceptable
   for accounts that can reach payroll? Recommend `crypto.randomInt`.
2. **Self-lockout via the matrix** (U-ROLE-4). Should `PATCH
   /roles/:name/permissions` refuse to remove a caller's own last
   `manageUsersAndRoles` grant?
3. **`passwordChangedAt` is set to `null` on create** (`usersService.js:75`) and
   nothing forces a change. Is first-login password rotation intended?
4. **PIN reset.** `pinHash` is stripped from all update paths
   (`usersService.js:86`) — is PIN reset intentionally impossible via this API?
5. **`GET /users` unpaged** — accept the scale cost, or add pagination to match
   `/employees`?
6. **Role name immutability** (U-ROLE-3) is silent: a `name` in the body is
   dropped without warning. Confirm that is desired.
7. **`User.role` is a soft string reference.** A role deleted while assigned to a
   user leaves `assertRoleExists` as the only guard — and it runs only on write,
   not on read. What happens at request time for such a user?
   (Answer, from code: `mergeRowsOverDefaults` returns `{}` → fail closed. So the
   user is locked out rather than escalated — the safe direction, but silent.)

---

## 9. Recommendations

1. **Keep the array normalisation at the API boundary** (done, §5.1). Do not
   revert call sites to `.data?.items`; the boundary now owns the shape.
2. **Keep `externalId` as a scalar write** (done, §5.2). A nested
   `linkedEmployee: { connect }` will silently reintroduce a 500 on every
   ESS-linked user creation.
3. **Keep audit fields on `originalUrl`** (done, §5.3). Never derive `action` or
   `entity` from `req.path`/`req.baseUrl` — they are mid-flight values.
4. **Replace `Math.random()`** in `usersService.randomPassword` with
   `crypto.randomInt` / `crypto.getRandomValues`.
5. **Guard self-lockout** in `setRolePermissions` — reject removing the caller's
   own final `manageUsersAndRoles` grant, or require a second holder.
6. **Add pagination to `GET /users`** to match the documented ≥1k posture.
7. **Move `roles.js` queries** into a `roleService` + `roleRepository` to match
   the layering the project guide mandates, and move its inline Zod schemas into
   `shared/contracts/roles.js`.
8. **Consider first-login password rotation** — `passwordChangedAt` is plumbed
   but unused.
9. **Sweep the audit `entity` values already in the DB.** Rows written before the
   §5.3 fix have `entity: "root"` for failures and a bare `POST /` for
   successes, so historical writes cannot be attributed to an endpoint. Consider
   a backfill or an operator note before relying on the trail for an incident.
10. **Unrelated cleanup spotted at repo root**: `Settings.jsx.tmp`,
    `settings_backup.jsx`, `db_new_section.txt` are tracked scratch files
    (duplicates of an older `Settings.jsx` plus a JSX fragment) that violate the
    "no debug leftovers" rule. Verified unreferenced in source; delete once
    confirmed unwanted.

---

## 10. Superseded Claims in `USER_ROLES_ANALYSIS.md`

That document predates the capability matrix and is wrong in several places.
Do not trust it without this table:

| Claim in analysis doc | Reality |
|---|---|
| §4.1 `requireRole()` is the gate | Gate is now `requirePermission()` capability matrix (`middleware/permission.js`); `rbac.js` survives only on the routes the guide lists as still-whitelisted |
| §6.1/6.2 password is `"changeme"` | Random 12-char password, returned as `temporaryPassword` (`usersService.js:73-79`) |
| §8 Issue 3 "No Audit Trail for Role Changes" | False — global `auditLog` mount covers it (`routes/index.js:66`) |
| §8 Issue 5 "Password 'changeme' is hardcoded" | Already fixed, same as above |
| §8 Issue 1 "Add soft-delete guard, check `deletedAt: null`" | Already implemented (`usersService.js:25`) |
| §8 Issue 2 "Role not enforced as FK" | Still true, but now guarded on every write by `assertRoleExists` |
| *(absent)* | It does not mention that ESS-linked user creation was returning 500 (§5.2) or that the audit trail mis-recorded successful writes (§5.3). Both are now fixed; the historical audit rows are not (§9.9) |
| §10 "Users: 10 total", `admin-tarlac`, "Roles: 10 + 1" | Stale. Live state: 13 users, 12 employees, 2 tenants (`DEFAULT`, `SOLANA` — not `TARLAC`), 12 roles, 228 `RolePermission` rows |
| *(absent)* | The entire capability matrix, `NOT_KEY_POSITION` policy, and `temporaryPassword` handoff are undocumented there |
