# Adding External Systems to HRMS

## Overview
HRMS acts as the credential authority for external integrations. IMS stores integration-specific configuration and secrets. This document describes the established pattern for adding a new external system.

There are two different things you might be doing:

| Goal | Where the work goes |
|------|--------------------|
| **Register an existing integration** (payroll, attendance, leave) with credentials | Pure UI — run `Settings → Integrations` Setup wizard. Nothing to code. |
| **Expose a brand-new data surface** to external systems | Backend first (catalog + routes), then the wizard picks it up automatically |

`Settings → Integrations` is rendered by `frontend/src/components/Integrations.jsx` (not by `Settings.jsx`) and is **SUPER_ADMIN only**. The six-step flow is documented in `src/docs/INTEGRATION_SETUP.md`.

---

## Registering an existing integration (no code)

1. `Settings → Integrations` → **Setup** tab
2. **Choose** the type (`PAYROLL`, `ATTENDANCE`, `LEAVE`)
3. **System** — create the `ExternalSystem` record (name, base URL, sync direction)
4. **Credentials** — create an API key; required scopes are pre-selected from the catalog
5. **Verify** — paste the key once, run the connectivity + scoped-read probes
6. **Events** (optional; skipped for `LEAVE`) — subscribe and copy the HMAC secret

Use **Advanced** for raw key/webhook/system management (rotate, deactivate, hard delete, send a test event).

---

## Exposing a new data surface (code required)

### 1. Declare the contract in the catalog
`backend/src/shared/integrationCatalog.js` is the single source of truth for scopes, events, external-system types and the per-type setup contract.

- Add the scope to `INTEGRATION_SCOPES` (it becomes valid on `POST /integrations/keys` automatically, because the contract uses `z.enum(SCOPE_NAMES)`).
- Add or extend the type in `INTEGRATION_TYPES` with `requiredScopes`, `recommendedScopes`, `endpoints`, `envKeys`, `events` and `testPath`.
- Add any new event to `WEBHOOK_EVENTS` **and** dispatch it with `dispatchWebhooks(tenantId, '<event>', payload)` in the owning service. The catalog is validated against reality — an event that is never dispatched is dead config, and an event dispatched but not catalogued is rejected at subscription time.

### 2. Add the backend route
- `backend/src/routes/integrations.js` — mount under `requireApiKey` + `requireScope('<scope>')` (or `requireAnyScope(...)`).
- Validate the query/body with a Zod contract in `backend/src/shared/contracts/integrations.js`.
- Read through a tenant-scoped repository query (`withTenant`) and return the paged `{ items, total, page, limit }` shape the other integration endpoints use.
- Add a connectivity probe (`POST /integrations/<type>/test`) so step 4 can prove reachability.
- Return only what the external system needs. Never expose secrets or internal IDs.

### 3. Wire the frontend client
- Extend `frontend/src/api/integrations.js` with the new calls (keep all UI calls inside `src/api/`; pages must not call backend URLs directly).
- Register the data probe in `CONNECTIVITY_PROBES` / `DATA_PROBES` in `frontend/src/components/IntegrationSetupWizard.jsx` so step 4 exercises it.

No Settings-page change is needed: the wizard's type cards, scope chips, endpoint list, event checklist and the Advanced external-system modal all read from the catalog.

### 4. RBAC
- Management routes (`keys`, `webhooks`, `external-systems`, `catalog`) are already `requireRole('SUPER_ADMIN')`. Data routes authenticate with the API key, not a JWT, and resolve the tenant from the key.
- If a new management action needs a different role, extend the router and the `Integrations` visibility check together — never one without the other.

### 5. Verify
- `cd backend && node --check src/routes/integrations.js`
- `cd frontend && npm run build`
- Colour lint (no hardcoded colours in the new UI)
- Exercise the new surface with a throwaway key holding only the new scope, and confirm a key without it gets 403 `FORBIDDEN`

### 6. Document it
- Add the endpoints to the `### Endpoint Summary` table in `src/docs/PAYROLL_INTEGRATION.md`.
- Record the flow, the readiness rules and the verification results in `src/docs/INTEGRATION_SETUP.md`.
