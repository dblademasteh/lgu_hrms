# Tenant Provisioning

## Overview
LGU-HRMS uses a shared-schema multi-tenancy model. All data is scoped by `tenantId`. JWT tokens carry `tenantId` and `role`. SUPER_ADMIN can view all tenants; all other roles are isolated to their tenant.

## Creating a New LGU Tenant

### 1. Create Tenant Record
```bash
cd backend
npx prisma db seed
```
Or via the Database manager UI `/database` → Tenants → Create, or via API:
```json
POST /api/v1/admin/tenants
{
  "code": "BATAAN",
  "name": "Bataan Province LGU"
}
```

### 2. Seed Initial Data
Run the tenant seeder with the new code. The seed file supports multiple tenants. Add the tenant to `tenantsData` in `backend/prisma/seed.js` or call `seedTenant(tenantId, code, hash)` manually.

Example:
```javascript
await seedTenant('tenant-bataan', 'BATAAN', hash);
```

This creates:
* Departments: `PGO-BATAAN`, `HRMO-BATAAN`, `FIN-BATAAN`
* Users: `admin-bataan`, `hr_manager-bataan`, `payroll_officer-bataan`, `department_head-bataan`, `auditor-bataan`
* Positions, 3 demo employees, leave credits, appointments, payroll period/run/items
* Attendance and leave request samples

Default password: `admin123` or `SEED_DEFAULT_PASSWORD` env.

### 3. Verify Isolation
1. Login as `admin-bataan` → should only see Bataan data
2. Login as `admin-default` → only sees Default LGU data
3. SUPER_ADMIN login can override via `X-Tenant-Id` header or `?tenantId=` query param

### 4. Tenant Resolution Options
Current: JWT `tenantId` claim only.
Future options:
* Subdomain: `bataan.hrms.local` → middleware resolves tenant from Host
* Login picker for shared usernames

## Seeding Multiple Tenants
`backend/prisma/seed.js` already seeds:
* `DEFAULT` – tenant-default
* `TARLAC` – tenant-tarlac

Add more entries to `tenantsData` array to auto-seed.

## Database Tools
Database manager `/database` is tenant-scoped for non-SUPER_ADMIN:
* `listTables`, `browse`, `export`, `summary` filter by tenantId
* `create`, `update`, `remove` stamp/check tenantId

## Backfill Existing Data
If migrating existing data to multi-tenant:
1. Assign `tenantId` to all existing rows
2. Re-run migrations
3. Update `User.tenantId` and `Employee.tenantId` to match

## Deleting or Deactivating a Tenant

### Soft Delete (Recommended)

Soft delete sets `isActive = false` on the tenant. This prevents new logins and hides the tenant from active listings, but preserves all data.

```bash
DELETE /api/v1/tenants/:id
Authorization: Bearer <SUPER_ADMIN_JWT>
Content-Type: application/json

{ "hardDelete": false }
```

**Response:**
```json
{
  "ok": true,
  "message": "Tenant deactivated"
}
```

### Hard Delete (Permanent)

Hard delete permanently removes the tenant and all associated data. This action is irreversible.

```bash
DELETE /api/v1/tenants/:id
Authorization: Bearer <SUPER_ADMIN_JWT>
Content-Type: application/json

{ "hardDelete": true }
```

**Response:**
```json
{
  "ok": true,
  "message": "Tenant permanently deleted"
}
```

### Safety Checks

- Cannot delete the last active tenant
- Only SUPER_ADMIN can delete tenants
- All deletions are logged in `AuditLog`
- Hard delete cascades to all tenant-scoped data

### Reactivation

To reactivate a soft-deleted tenant:

```bash
PATCH /api/v1/tenants/:id
Authorization: Bearer <SUPER_ADMIN_JWT>
Content-Type: application/json

{ "isActive": true }
```
