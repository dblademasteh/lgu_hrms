# Settings Documentation

## Overview

The Settings page (`/settings`) is the central configuration hub for the LGU HRMS application. It provides users with granular control over application preferences, account management, and administrative tools.

**Access:** ADMIN role required for most settings sections. Some sections may be accessible to users with `SUPER_ADMIN` privileges.

**URL:** `http://localhost:5173/settings`

---

## Tab Navigation

The Settings page consists of seven primary tabs:

| Tab | ID | Icon | Description |
|-----|----|------|-------------|
| Appearance | `appearance` | LayoutGrid | Theme, sidebar style, font, accent color, UI scale |
| Notifications | `notifications` | Bell | Toast, email, push, SMS preferences |
| Account | `account` | User | Profile management, security, 2FA |
| Integrations | `integrations` | Link2 | API Keys, Webhooks, External Systems |
| Database | `database` | Database | Table management, query console, backups |
| Compliance | `compliance` | ShieldCheck | Audit logs, tax rules, leave rules |
| System | `system` | Info | Backend health, DB status, migrations |

---

## Appearance Settings

### Theme
- **Options:** Light, Dark
- **Shortcut:** Theme toggle in header also switches
- **Storage:** Local storage (`lgu-theme`)

### Sidebar Style
- **Available Styles:** Configured via `frontend/src/sidebarStyle.js`
- **Immediate effect:** Yes

### UI Scale
- **Range:** 80% - 120%
- **Label:** "UI density"
- **Storage:** Local storage (`lgu-ui-scale`)

### Font Family
- **Available Fonts:** Inter, Sora, JetBrains Mono, DM Sans, Roboto, Open Sans, Lato, Poppins, Nunito, Montserrat, Source Sans 3, Work Sans, Plus Jakarta Sans
- **Storage:** Local storage (`lgu-font-family`)

### Accent Color
- **Presets:** Blue (#1d4ed8), Teal (#0f766e), Purple (#7c3aed), Red (#dc2626), Green (#059669), Amber (#d97706)
- **Custom:** Color picker available
- **Storage:** Local storage (`lgu-accent`)

---

## Notifications Settings

### Types
| Notification Type | Description | Storage |
|-------------------|-------------|---------|
| In-app (toasts) | Toast notifications in browser | `lgu-notif-inapp` |
| Email | Email alerts for approvals | `lgu-notif-email` |
| Push | Browser push notifications | `lgu-notif-push` |
| SMS | SMS alerts for critical payroll events | `lgu-notif-sms` |

### Quiet Hours
- **Format:** `HH:MM-HH:MM` (e.g., `22:00-07:00`)
- **Default:** `22:00-07:00`
- **Storage:** Local storage (`lgu-notif-quiet`)

### Toast Styles
- Configurable via `frontend/src/toastStyle.js`

---

## Account Settings

### Profile Information
- Display Name (required)
- Email
- Contact Number (validated phone format)
- Emergency Contact

### Security
- **Password Change:** Requires current password + new password (8+ chars, mixed case, number, symbol)
- **2FA Status:** Shows enabled/disabled state
- **Sessions:** View and revoke active sessions
- **Delegations:** Manage work delegation to other users
- **Account Deactivation:** Inactivate user account

---

## Integrations Settings

**SUPER_ADMIN only** (backend mounts `requireRole('SUPER_ADMIN')` on every management route; the tab is filtered out of the tab list for other roles).

Rendered by `frontend/src/components/Integrations.jsx`, extracted from this page. It has two views:

### Setup view (default) — `IntegrationSetupWizard`
A six-step wizard for `PAYROLL`, `ATTENDANCE` and `LEAVE`:

| # | Step | Gate to advance |
|---|------|-----------------|
| 1 | Choose integration type | a type is chosen |
| 2 | Register external system | an `ExternalSystem` of that type exists |
| 3 | Issue credentials | an active key holds every `requiredScopes` entry |
| 4 | Verify | connectivity probe **and** scoped read both pass (key pasted once, never stored) |
| 5 | Events (skipped for `LEAVE`) | a webhook covers ≥1 recommended event |
| 6 | Monitor | — |

Scope chips, recommended events, endpoint lists and environment variables all come from `GET /api/v1/integrations/catalog` (backed by `backend/src/shared/integrationCatalog.js`), so the UI cannot drift from server validation.

Full flow, chart and verification results: `src/docs/INTEGRATION_SETUP.md`.

### Advanced view
The raw list + modal management surface (previously the whole tab):

- **API Keys** — list, create (validated against the catalog scopes), activate/deactivate, delete
- **Webhooks** — add, edit events, send test event, rotate secret, disable, delete
- **External Systems** — add/edit/delete, mark synced

### API Keys
- **Purpose:** External HR systems access to employee data
- **Lifecycle:** Create → Store securely → Rotate every 90 days
- **Frontend:** Settings → Integrations → Advanced → API Keys
- **Backend Endpoints:**
  - `GET /api/v1/integrations/catalog` - Scope/event/type catalog (SUPER_ADMIN)
  - `GET /api/v1/integrations/keys` - List API keys for current tenant
  - `POST /api/v1/integrations/keys` - Create new API key (scope enum validated)
  - `PATCH /api/v1/integrations/keys/:id/revoke` - Deactivate
  - `PATCH /api/v1/integrations/keys/:id/reactivate` - Re-enable
  - `DELETE /api/v1/integrations/keys/:id` - Revoke (soft) or hard-delete with `?hard=true`
- **Frontend API Client:** `frontend/src/api/integrations.js`
- **Security Notes:**
  - Key is only returned once at creation time
  - User must save immediately
  - SHA-256 hash stored in database
  - Keys are tenant-scoped
  - 90-day rotation recommended

### Webhooks
- **Purpose:** Subscribe to domain events (11 catalogued: `employee.created|updated|deleted`, `attendance.created|updated|bulk_updated`, `payroll.period.created|closed`, `payroll.run.created|approved|posted`)
- **Payload:** Includes `event`, `tenantId`, the event payload, and `timestamp`
- **Signature:** HMAC-SHA256 in the `X-HRMS-Signature` header; `POST /integrations/webhooks/:id/test` sends a sample
- **Events:** see `WEBHOOK_EVENTS` in `backend/src/shared/integrationCatalog.js` (source of truth, rendered in the UI)
- **Management:** Dedicated webhook management page

### External Systems Status
| System | Description | Status |
|--------|-------------|--------|
| Prime HR | External HR system | Connected |
| CSC Portal | Civil Service Commission | Pending |
| Payroll | Payroll provider | Connected |

---

## Database Settings (ADMIN and SUPER_ADMIN)

- **Roles:** Both roles get the tenant-scoped dashboard, table browser, per-table export, and tenant backup/dump. SUPER_ADMIN additionally gets the query console, full backup/dump, slow queries, retention, connections, size, and record writes. Tenants never see other tenants' rows.

### Dashboard Information
- **Connection:** PostgreSQL latency + uptime
- **DB Size:** Database file size in MB (SUPER_ADMIN only)
- **Migrations:** Prisma migration status (In sync / X pending)
- **Migration History:** Applied migrations with timestamps

### Table Browser
- **Filter:** Search by table name or description
- **Columns:** Table name, record count, description
- **Browse:** Selecting a table lists up to 3 rows first with a **"Show all (N)"** expand / "Collapse" toggle in the table header and a "Show all N rows" button at the bottom; the row limit pagination takes over once expanded.
- **Actions (per table):**
  - Add Record / Edit / Delete (SUPER_ADMIN only; ADMIN sees read-only/locked states)
  - Export CSV/JSON (both roles)
  - Check dependents before deletion (SUPER_ADMIN only)
  - `browse` validates `orderBy`; deleting a row with FK references returns a clean 409

### Query Console
- **Read-only:** SELECT/WITH statements only
- **Row Limit:** 200 rows
- **Features:** Run query, Explain plan
- **Note:** SUPER_ADMIN role required for `POST /api/v1/database/query`

### Backups
- **Both roles:** Tenant backup via `GET /tenant-dump` / `GET /tenant-export` (scoped to the caller's tenant; SUPER_ADMIN can pick a tenant with `X-Tenant-Id`)
- **SUPER_ADMIN only:**
  - Full JSON backup (`GET /backup`, gzipped JSON of all managed tables)
  - SQL dump (`.sql` via pg_dump, `GET /dump`)
  - Data-only dump (`GET /dump?dataOnly=true`)
- **Storage:** Client-side download

### Retention & Cleanup (SUPER_ADMIN only)
- **Preview:** Shows purge candidates for:
  - Login events
  - Revoked sessions
  - Audit logs
  - Soft-deleted employees
- **Purge:** Execute cleanup operations

### Slow Query Analysis (SUPER_ADMIN only)
- Requires `pg_stat_statements` extension
- Shows: Query, Calls, Total ms, Mean ms, % of DB time

---

## API Reference

### Account Endpoints
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/account/me` | Get profile | AUTH |
| PATCH | `/api/v1/account/me` | Update profile | AUTH |
| POST | `/api/v1/account/password/change` | Change password | AUTH |
| GET | `/api/v1/account/sessions` | List sessions | AUTH |
| POST | `/api/v1/account/sessions/:id/revoke` | Revoke session | AUTH |
| GET | `/api/v1/account/login-events` | Login history | AUTH |
| GET | `/api/v1/account/delegations` | List delegations | AUTH |
| POST | `/api/v1/account/delegations` | Create delegation | AUTH |
| DELETE | `/api/v1/account/delegations/:id` | Delete delegation | AUTH |
| POST | `/api/v1/account/deactivate` | Deactivate account | AUTH |
| POST | `/api/v1/account/export` | Export profile data | AUTH |
| POST | `/api/v1/account/2fa/setup` | Setup 2FA | AUTH |
| POST | `/api/v1/account/2fa/verify` | Verify 2FA | AUTH |

### Database Endpoints
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/database` | List tables | ADMIN |
| GET | `/api/v1/database/summary` | DB summary | ADMIN |
| GET | `/api/v1/database/health` | Connection health | ADMIN |
| GET | `/api/v1/database/migrations` | Migration status | ADMIN |
| GET | `/api/v1/database/tenant-dump` | Tenant-scoped JSON backup | ADMIN |
| GET | `/api/v1/database/tenant-export` | Tenant-scoped export bundle | ADMIN |
| GET | `/api/v1/database/:name/schema` | Table schema | ADMIN |
| GET | `/api/v1/database/:name/browse` | Browse records (validated orderBy) | ADMIN |
| GET | `/api/v1/database/:name/export` | Export records CSV/JSON | ADMIN |
| GET | `/api/v1/database/:name/dependents/:id` | Check FK dependents | ADMIN |
| GET | `/api/v1/database/:name/:id` | Get one record | ADMIN |
| GET | `/api/v1/database/backup` | Download full backup | SUPER_ADMIN |
| GET | `/api/v1/database/dump` | SQL data dump | SUPER_ADMIN |
| GET | `/api/v1/database/slow-queries` | Slow query list | SUPER_ADMIN |
| GET | `/api/v1/database/retention` | Retention preview | SUPER_ADMIN |
| GET | `/api/v1/database/connections` | Active connections | SUPER_ADMIN |
| GET | `/api/v1/database/size` | DB + per-table sizes | SUPER_ADMIN |
| POST | `/api/v1/database/query` | Execute query | SUPER_ADMIN |
| POST | `/api/v1/database/retention/run` | Run retention cleanup | SUPER_ADMIN |
| POST | `/api/v1/database/:name/import` | Import CSV (stamps tenantId) | SUPER_ADMIN |
| POST | `/api/v1/database/:name` | Create record | SUPER_ADMIN |
| PUT | `/api/v1/database/:name/:id` | Update record | SUPER_ADMIN |
| DELETE | `/api/v1/database/:name/:id` | Delete record (409 on FK) | SUPER_ADMIN |

### Integration Endpoints
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/v1/integrations/health` | Health check | None |
| POST | `/api/v1/integrations/keys` | Create API key | AUTH |

---

## Frontend Architecture

### Component Structure
```
frontend/src/pages/Settings.jsx
├── Tabs Configuration (layout, icons, ids)
├── State Management (useState hooks)
├── Side Effects (useEffect for persistence)
└── Sections
    ├── Appearance
    ├── Notifications
    ├── Account
    ├── Integrations
    ├── Database
    ├── Compliance
    └── System
```

### State Persistence
Settings are persisted using:
- **Local Storage:** Theme, fonts, accent, notification preferences
- **Database/Audit Log:** Profile changes, password changes, security settings

### Validation
- Email validation: RFC-compliant regex
- Phone validation: 7-15 digits with spaces/hyphens
- Password strength: 8+ chars with mixed case, number, symbol

---

## Development Notes

### Color Hardcode Lint
```powershell
Get-ChildItem frontend/src -Recurse -Include *.jsx,*.js | 
  Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|slate-|gray-|bg-white|text-white'
```

### Common Issues
1. **401 Unauthorized:** User session expired, re-authenticate
2. **403 Forbidden:** Insufficient role for ADMIN/SUPER_ADMIN sections
3. **404 on API:** Back-end server not running on port 4000

### Tenant Scope
- Settings page shows tenant context: `TENANT · tenant-default`
- SUPER_ADMIN can override via `X-Tenant-Id` header

---

## RBAC Matrix

| Setting Section | ADMIN | PAYROLL_OFFICER | HR_MANAGER | DEPARTMENT_HEAD | AUDITOR |
|-----------------|-------|-----------------|------------|-----------------|---------|
| Appearance | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ |
| Account | Own | Own | Own | Own | Own |
| Integrations | ✓ | | | | |
| Database | ✓ | | | | |
| Compliance | ✓ | | | | ✓ |
| System | ✓ | | | | |

"✓" = Read access,Bold = Write/modify access

> Nuance: Database is ✓ (read) for ADMIN — tenant-scoped browser/dashboards/exports/tenant backups. SUPER_ADMIN only: record writes (Add/Edit/Delete), CSV import, query console, full backup/dump, slow queries, retention, connections, and DB size.