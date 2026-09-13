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

### API Keys
- **Purpose:** External HR systems access to employee data
- **Lifecycle:** Create → Store securely → Rotate every 90 days
- **Frontend:** Settings → Integrations → API Keys tab shows existing keys, create new keys, revoke keys
- **Backend Endpoints:**
  - `GET /api/v1/integrations/keys` - List API keys for current tenant
  - `POST /api/v1/integrations/keys` - Create new API key
  - `DELETE /api/v1/integrations/keys/:id` - Revoke API key
- **Frontend API Client:** `frontend/src/api/integrations.js`
- **Security Notes:**
  - Key is only returned once at creation time
  - User must save immediately
  - SHA-256 hash stored in database
  - Keys are tenant-scoped
  - 90-day rotation recommended

### Webhooks
- **Purpose:** Subscribe to employee events: `created`, `updated`, `deleted`
- **Payload:** Includes `tenantId`, `employeeId`, `changedFields`, `timestamp`, `actorUserId`
- **Future:** Webhook management UI to be implemented
- **External Systems Status:**
  - Prime HR • Connected
  - CSC Portal • Pending
  - Payroll • Connected
- **Events:** `employee.created`, `employee.updated`, `employee.deleted`
- **Management:** Dedicated webhook management page

### External Systems Status
| System | Description | Status |
|--------|-------------|--------|
| Prime HR | External HR system | Connected |
| CSC Portal | Civil Service Commission | Pending |
| Payroll | Payroll provider | Connected |

---

## Database Settings (ADMIN Only)

### Dashboard Information
- **Connection:** PostgreSQL latency + uptime
- **DB Size:** Database file size in MB
- **Migrations:** Prisma migration status (In sync / X pending)
- **Migration History:** Applied migrations with timestamps

### Table Browser
- **Filter:** Search by table name or description
- **Columns:** Table name, record count, description
- **Actions (per table):**
  - Add Record
  - Edit Record
  - Delete Record (with FK constraint checking)
  - Export CSV/JSON
  - Check dependents before deletion

### Query Console
- **Read-only:** SELECT/WITH statements only
- **Row Limit:** 200 rows
- **Features:** Run query, Explain plan
- **Note:** SUPER_ADMIN role required for `POST /api/v1/database/query`

### Backups
- **Options:**
  - Full JSON backup
  - SQL dump (`.sql` via pg_dump)
  - Data-only dump
- **Storage:** Client-side download

### Retention & Cleanup
- **Preview:** Shows purge candidates for:
  - Login events
  - Revoked sessions
  - Audit logs
  - Soft-deleted employees
- **Purge:** Execute cleanup operations

### Slow Query Analysis
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
| GET | `/api/v1/database/backup` | Download backup | ADMIN |
| GET | `/api/v1/database/dump` | SQL data dump | ADMIN |
| GET | `/api/v1/database/slow-queries` | Slow query list | ADMIN |
| GET | `/api/v1/database/retention` | Retention preview | ADMIN |
| POST | `/api/v1/database/query` | Execute query | SUPER_ADMIN |
| POST | `/api/v1/database/retention/run` | Run retention cleanup | SUPER_ADMIN |
| POST | `/api/v1/database/:name/import` | Import CSV | SUPER_ADMIN |
| GET | `/api/v1/database/:name/schema` | Table schema | ADMIN |
| GET | `/api/v1/database/:name/browse` | Browse records | ADMIN |
| GET | `/api/v1/database/:name/export` | Export records | ADMIN |
| POST | `/api/v1/database/:name` | Create record | ADMIN |
| PUT | `/api/v1/database/:name/:id` | Update record | ADMIN |
| DELETE | `/api/v1/database/:name/:id` | Delete record | ADMIN |

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