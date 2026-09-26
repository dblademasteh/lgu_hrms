# Integration Setup Wizard

## Overview
`Settings → Integrations` is a **six-step guided setup** instead of three unrelated cards. The admin picks what they are connecting, and the wizard walks the order the system actually requires: register the system → issue a scoped key → prove the key works → optionally subscribe to events → review.

Before this existed, the UI showed API Keys / Webhooks / External Systems side by side and left the ordering to `src/docs/PAYROLL_INTEGRATION.md`. The wizard is that document, executable.

**Entry point:** `Settings → Integrations` (SUPER_ADMIN only — the tab is hidden for every other role, matching the backend `requireRole('SUPER_ADMIN')` mount on `/integrations` management routes).

**Files**
| Concern | File |
|---|---|
| Container: data load, Setup/Advanced toggle, management lists, modals | `frontend/src/components/Integrations.jsx` |
| The six steps | `frontend/src/components/IntegrationSetupWizard.jsx` |
| HTTP calls | `frontend/src/api/integrations.js` |
| Scope/event/type truth (served to the UI) | `backend/src/shared/integrationCatalog.js` |
| Catalog route | `GET /api/v1/integrations/catalog` |
| Leave data surface | `backend/src/routes/integrations.js` + `leaveRepository.findIntegrationRequests/findIntegrationCredits` |

---

## 1. The six steps

| # | Step | What it does | Done when |
|---|------|--------------|-----------|
| 1 | **Choose** | Pick `PAYROLL`, `ATTENDANCE` or `LEAVE` from the catalog | a type is chosen (persisted per tenant) |
| 2 | **System** | Create the `ExternalSystem` record (name, base URL, sync direction) | an `ExternalSystem` of that type exists |
| 3 | **Credentials** | Create an API key with the type's required scopes, required + recommended pre-selected from `catalog.scopes`; key revealed once, copy button, "I saved this key" gate before Next | an active key holds **every** `requiredScopes` entry |
| 4 | **Verify** | Paste the key once, run a connectivity probe **and** a scoped read | both probes pass |
| 5 | **Events** | Subscribe to the type's recommended webhook events (skipped for `LEAVE`, which publishes none), copy the HMAC secret, send a test event | a webhook covers ≥1 of the type's events |
| 6 | **Monitor** | Summary: system, credentials, last verified, events, full endpoint list for the key, rotation policy | — |

**Readiness is derived, never stored.** Steps 1/2/3/5 are computed from `localStorage` (chosen type) plus the live `ApiKey` / `ExternalSystem` / `WebhookSubscription` rows. Only the step-4 verification result is cached, under `lgu-integration-verify:<tenantId>:<TYPE>`, so a reload shows "last verified" without re-pasting a secret. Deleting a key or system in the Advanced view immediately un-completes the matching step.

### Why verify runs two probes
A connectivity probe only proves the key hash matched. The second probe is a real scoped read (`GET /integrations/payroll/periods?limit=1`, `GET /integrations/attendance?startDate=monthStart&endDate=today&limit=1`, `GET /integrations/leave/requests?limit=1`), so a key missing a scope fails here with a 403 the admin can see, instead of failing silently in the external system at 2am.

The key is held in component state for the duration of the step and is never written to browser storage or sent anywhere except the API it authenticates.

---

## 2. Catalog (single source of truth)

`backend/src/shared/integrationCatalog.js` declares scopes, webhook events and the per-type contract. The same file drives:

- **Zod validation** — `createApiKeySchema.scopes` is `z.enum(SCOPE_NAMES)` and `createWebhookSchema.events` is `z.enum(EVENT_NAMES)`. A typo'd scope used to be accepted and then 403 at runtime; now it is a 400 that lists the valid values.
- **`ExternalSystem.type`** — validated against `EXTERNAL_SYSTEM_TYPES` (`PAYROLL`, `ATTENDANCE`, `LEAVE`, `HRIS`, `PORTAL`, `OTHER`).
- **`GET /integrations/catalog`** — returns `{ scopes, events, types, systemTypes }` so the wizard renders exactly what the server enforces. Adding an endpoint means editing the catalog, not the UI.

| Scope | Grants |
|---|---|
| `employees:read` | `GET /integrations/employees`, `/departments` |
| `attendance:read` | `GET /integrations/attendance` |
| `attendance:ingest` | `POST /integrations/attendance/punch`, `/bulk`, `/test` |
| `leave:read` | `GET /integrations/leave/requests`, `/credits`, `POST /leave/test` |
| `loans:read` | `GET /integrations/loans` (loans + amortization schedules for salary-deduction sync) |
| `payroll:read` | `GET /integrations/payroll/{runs,runs/:id,periods,payslips,test}` |
| `payroll:write` | reserved — currently grants no extra endpoint |

---

## 3. Setup flow

```
   Settings → Integrations (SUPER_ADMIN)
                │
                ▼
   ┌────────────────────────┐   pick PAYROLL / ATTENDANCE / LEAVE
   │ 1 Choose               │   ── stored: lgu-integration-setup-type:<tenant>
   └───────────┬────────────┘
               ▼
   ┌────────────────────────┐   POST /integrations/external-systems
   │ 2 System               │   ── done: ExternalSystem(type) exists
   └───────────┬────────────┘
               ▼
   ┌────────────────────────┐   POST /integrations/keys  (scopes from catalog)
   │ 3 Credentials          │   ── raw key shown ONCE, "saved" gate
   └───────────┬────────────┘
               ▼
   ┌────────────────────────┐   POST /integrations/<type>/test      (connectivity)
   │ 4 Verify               │   GET  /integrations/<probe>           (scoped read)
   └───────────┬────────────┘   ── stored: lgu-integration-verify:<tenant>:<TYPE>
               ▼
   ┌────────────────────────┐   POST /integrations/webhooks
   │ 5 Events (optional)    │   POST /integrations/webhooks/:id/test
   └───────────┬────────────┘   ── skipped for LEAVE (no outbound events)
               ▼
   ┌────────────────────────┐   read-only summary + endpoint list
   │ 6 Monitor              │
   └────────────────────────┘

   Advanced view ──► API Keys (activate/deactivate/delete)
                  ──► Webhooks (add any event, test, rotate secret, disable, delete)
                  ──► External Systems (add/edit full form, delete)
```

---

## 4. Adding a fourth integration type

1. Add the type object to `INTEGRATION_TYPES` in `backend/src/shared/integrationCatalog.js` — label, blurb, `requiredScopes`, `recommendedScopes`, `endpoints`, `envKeys`, `events`, `testPath`.
2. Add any new scope to `INTEGRATION_SCOPES` (it becomes valid on key creation automatically).
3. Add the read endpoints under `backend/src/routes/integrations.js` behind `requireApiKey` + `requireScope(...)`, with a Zod query contract in `shared/contracts/integrations.js` and a paged, tenant-scoped repository query.
4. Add the probe pair in `frontend/src/components/IntegrationSetupWizard.jsx` (`CONNECTIVITY_PROBES` + `DATA_PROBES`) and the HTTP method in `frontend/src/api/integrations.js`.
5. If the type publishes events, dispatch them with `dispatchWebhooks(tenantId, '<event>', payload)` in the owning service and add them to the type's `events` list.

No Settings-page change is needed — the wizard, the type cards, the scope chips, the event checklist and the Advanced modal all read from the catalog.

---

## 5. Behaviour changes (vs. the old flat tab)

| Before | Now |
|---|---|
| Any string accepted as an `ExternalSystem.type` | validated against `EXTERNAL_SYSTEM_TYPES` (`PAYROLL`, `ATTENDANCE`, `LEAVE`, `HRIS`, `PORTAL`, `OTHER`) — a typo 400s instead of creating an unusable system |
| Any string accepted as a key scope or webhook event | validated against the catalog — the 400 lists the valid values |
| Leave was not exposed to external systems | `GET /integrations/leave/requests`, `/credits`, `POST /leave/test` behind `leave:read` |
| `/integrations` reachable by tenant ADMINs in the UI | tab is SUPER_ADMIN only (the backend mount was already `requireRole('SUPER_ADMIN')`) |

Existing rows are unaffected: the seeded external system is `type: 'PAYROLL'`, already inside the enum.

## 6. Verified behaviour

Checked against a running backend with a throwaway key (created and hard-deleted after the run):

| Check | Result |
|---|---|
| `GET /integrations/catalog` (SUPER_ADMIN) | 6 scopes, 11 events, 3 types, 6 system types |
| `GET /integrations/leave/requests?limit=2` | paged `{items,total,page,limit}`, employee identity + department/position included |
| `?startDate=2026-09-01&endDate=2026-09-30` vs `2020-01` | 1 vs 0 — overlap filter works |
| `?status=APPROVED` / `?employeeNumber=…` | filtered correctly |
| `GET /integrations/leave/credits?year=2026` | 6000 rows for the seeded tenant, year filter honoured |
| `POST /integrations/leave/test` | `{ ok: true, message: 'Leave integration endpoint reachable', tenantId }` |
| `leave:read`-only key → `GET /integrations/payroll/periods` | 403 (scope gate holds) |
| `POST /integrations/keys` with `leave:write` | 400 listing the six valid scopes |
| `POST /integrations/webhooks` with `employee.exploded` | 400 |
| `npm run build` (frontend) | passes |
| `node --check` (5 backend files) | passes |
| Colour lint (`index.css` tokens only) | passes — two pre-existing accent-preset hexes in `Settings.jsx` untouched |

---

## 7. Related documentation
- `src/docs/PAYROLL_INTEGRATION.md` — full `lgu-payroll` API reference (now includes the leave and loan surfaces)
- `src/docs/PAYROLL.md` — payroll delegation status (HRMS is a read-only mirror; the engine is deleted)
- `src/docs/ADDING_EXTERNAL_SYSTEMS.md` — how to onboard a new external system
- `src/docs/SETTINGS.md` — Settings tab layout
- `docs/ATTENDANCE_INTEGRATION.md` — attendance ingestion detail
