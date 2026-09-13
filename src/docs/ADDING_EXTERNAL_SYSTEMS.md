# Adding External Systems to HRMS

## Overview
HRMS acts as the credential authority for external integrations. IMS stores integration-specific configuration and secrets. This document describes the established pattern for adding a new external system.

## Steps

### 1. Define the backend contract in HRMS
- Add a new route under `lgu_hrms/backend/src/routes/integrations.js` or a dedicated router.
- Use the existing `requireApiKey` middleware for request-scoped access.
- Return only the fields the external system needs. Never expose secrets or internal IDs.

### 2. Add a client adapter in the HRMS frontend
- Create `lgu_hrms/frontend/src/api/<system>.js` mirroring the backend route.
- Keep all UI calls going through `src/api/`. Do not call backend URLs directly from pages.

### 3. Store config in IMS, not HRMS
- Reuse the existing `HrmsSyncConfig` pattern or add a new `ExternalSystemConfig` model in IMS.
- Store secrets in environment variables or a secrets manager, not in the database.
- HRMS remains the credential authority; IMS holds integration-specific config.

### 4. Add the UI to HRMS Settings
- Add a new section/card in `lgu_hrms/frontend/src/pages/Settings.jsx` under the Integrations tab.
- Reuse `Spinner`, `ConfirmDialog`, and toast patterns already in place.

### 5. Wire auth and RBAC
- Frontend: add the route to `Protected` and the sidebar if needed.
- Backend: ensure only ADMIN or the intended role can manage the integration.
