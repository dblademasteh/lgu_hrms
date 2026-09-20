# Attendance Integration Configuration

## Overview

The HRMS attendance system accepts attendance data from external attendance systems via API-key-authenticated endpoints. Ingested data feeds directly into payroll computation.

## Architecture

```
┌─────────────────────┐      x-api-key       ┌──────────────────────┐
│ External Attendance │ ───────────────────> │  HRMS Backend        │
│ System              │                      │  /integrations/      │
│                     │ <── attendance ────> │  attendance/         │
│ - Push punches      │      data            │  - punch             │
│ - Bulk import       │                      │  - bulk              │
│ - Device sync       │                      │  - test              │
└─────────────────────┘                      └──────────────────────┘
                                                     │
                                                     ▼
                                              ┌──────────────────────┐
                                              │  Payroll Engine      │
                                              │  reads Attendance    │
                                              │  records for salary  │
                                              │  computation         │
                                              └──────────────────────┘
```

## Prerequisites

- Backend running on `http://localhost:4000`
- Frontend running on `http://localhost:5173`
- Super Admin access to HRMS
- At least one employee record with `employeeNumber` in HRMS

---

## Step 1: Create an API Key

1. Go to **Settings > Integrations**
2. Under **API Keys**, click **Create API Key**
3. Enter a name (e.g., `Attendance System`)
4. Select scopes:
   - `attendance:ingest` (required for punch/bulk ingestion)
   - `employees:read` (optional, if attendance system needs employee lookup)
5. Click **Create**
6. **Copy and save the key** — it will not be shown again

**Important**: The API key is shown only once. Store it securely.

---

## Step 2: Register the External Attendance System

1. Still in **Settings > Integrations**, under **External Systems**, click **Add System**
2. Fill in:
   - **Name**: `Attendance System` (or your system name)
   - **Type**: `Attendance`
   - **Base URL**: `http://localhost:4000/api/v1` (HRMS API base)
   - **API Key**: paste the key from Step 1
3. Expand the **Attendance** section and set:
   - **Ingestion Mode**: `Push / Webhook`, `Poll / Pull`, or `Bulk Import`
   - **Poll Interval**: seconds between syncs (e.g., `300` for 5 minutes) — only for pull mode
   - **Device / Terminal ID**: optional device identifier (e.g., `ZK-400`)
   - **Punch Key**: optional shared secret for kiosk/public punch endpoints
4. Click **Add**

---

## Step 3: Test Connection

1. In the **External Systems** list, find your Attendance entry
2. Click **Test**
3. Enter the HRMS API key from Step 1
4. Click **Test** — you should see `Attendance endpoint reachable`

---

## Step 4: Configure Your Attendance System

Use these details in your external attendance system:

| Setting | Value |
|---------|-------|
| HRMS Base URL | `http://localhost:4000/api/v1` |
| Endpoint - Single punch | `POST /integrations/attendance/punch` |
| Endpoint - Bulk import | `POST /integrations/attendance/bulk` |
| Auth header | `x-api-key: <your-api-key>` |
| Punch body | `{ "employeeNumber": "...", "punchType": "IN\|OUT", "at": "2026-09-20T08:00:00Z", "deviceId": "..." }` |
| Bulk body | `{ "records": [{ "employeeNumber": "...", "date": "YYYY-MM-DD", "timeIn": "HH:MM", "timeOut": "HH:MM", "hours": 9, "source": "IMPORT" }] }` |

---

## Step 5: Verify Data Flow

1. In HRMS, go to **Attendance** page
2. You should see a banner showing **Connected: [your system name]**
3. Trigger a punch or bulk import from your attendance system
4. Records will appear with source badge: `IMPORT`, `DEVICE`, `PUNCH`, or `MANUAL`
5. Payroll computation will automatically use these attendance records

---

## API Reference

### POST /integrations/attendance/punch

Single punch event from external attendance system.

**Headers**
```
x-api-key: <api-key-with-attendance:ingest-scope>
Content-Type: application/json
```

**Body**
```json
{
  "employeeNumber": "EMP-DEFAULT-0001",
  "punchType": "IN",
  "at": "2026-09-20T08:00:00Z",
  "deviceId": "ZK-400",
  "source": "IMPORT"
}
```

**Response**
```json
{
  "message": "Punched in successfully",
  "record": {
    "id": "uuid",
    "employeeId": "uuid",
    "date": "2026-09-20T00:00:00.000Z",
    "timeIn": "2026-09-20T08:00:00.000Z",
    "timeOut": null,
    "hours": null,
    "remark": "Tardiness",
    "source": "IMPORT",
    "employee": {
      "firstName": "Maria",
      "lastName": "Santos",
      "employeeNumber": "EMP-DEFAULT-0001"
    }
  }
}
```

---

### POST /integrations/attendance/bulk

Bulk import attendance records from external system.

**Headers**
```
x-api-key: <api-key-with-attendance:ingest-scope>
Content-Type: application/json
```

**Body**
```json
{
  "records": [
    {
      "employeeNumber": "EMP-DEFAULT-0001",
      "date": "2026-09-20",
      "timeIn": "08:00",
      "timeOut": "17:00",
      "hours": 9,
      "remark": "On time",
      "source": "IMPORT"
    }
  ]
}
```

**Response**
```json
{
  "results": [
    {
      "status": "created",
      "id": "uuid",
      "employeeNumber": "EMP-DEFAULT-0001"
    }
  ]
}
```

---

### POST /integrations/attendance/test

Connectivity check for attendance integration.

**Headers**
```
x-api-key: <api-key-with-attendance:ingest-scope>
Content-Type: application/json
```

**Response**
```json
{
  "ok": true,
  "message": "Attendance ingestion endpoint reachable",
  "tenantId": "tenant-default"
}
```

---

## Field Reference

### Punch Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| employeeNumber | string | Yes | Employee number in HRMS |
| punchType | enum | Yes | `IN` or `OUT` |
| at | datetime | No | Punch timestamp (ISO-8601). Defaults to now |
| deviceId | string | No | Device/terminal identifier |
| source | string | No | Source tag. Default: `IMPORT` |

### Bulk Import Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| employeeNumber | string | Yes | Employee number in HRMS |
| date | string | Yes | Date in `YYYY-MM-DD` format |
| timeIn | string | No | Time in `HH:MM` or `HH:MM:SS` format |
| timeOut | string | No | Time in `HH:MM` or `HH:MM:SS` format |
| hours | number | No | Worked hours (0-24) |
| remark | string | No | Remark text. Auto-computed if omitted |
| source | string | No | Source tag. Default: `IMPORT` |

---

## Source Badges

| Source | Description |
|--------|-------------|
| `IMPORT` | Ingested from external system via API |
| `DEVICE` | Pulled from biometric device |
| `PUNCH` | Kiosk/public punch |
| `MANUAL` | Manually entered in HRMS |

---

## Rules & Validation

- **Employee lookup**: `employeeNumber` must exist in HRMS for the tenant
- **Date validation**: Future dates are rejected
- **Deduplication**: Bulk import updates existing records for the same employee + date
- **Remark auto-computation**: If `remark` is omitted, the system computes:
  - `Tardiness` — if punch-in is late per `AttendanceRule`
  - `Overtime` — if worked hours exceed scheduled hours
  - `On leave` — if employee is on approved leave
  - `On time` — if punch-in is on time
- **Scope enforcement**: API key must have `attendance:ingest` scope
- **Tenant isolation**: All records are scoped to the API key's tenant

---

## Payroll Integration

Attendance records are automatically consumed by the payroll engine:

1. Payroll run generation queries `Attendance` records for the payroll period
2. Hours, tardiness, and overtime are computed per employee
3. Attendance-based deductions and additions are applied
4. No additional configuration needed — data flows automatically

---

## Troubleshooting

### 401 Unauthorized
- Check API key is correct
- Check API key is active (not revoked)
- Check `x-api-key` header is present

### 403 Forbidden
- API key does not have `attendance:ingest` scope
- Create a new API key with the correct scope

### 404 Employee Not Found
- `employeeNumber` does not exist in HRMS
- Check tenant match (API key is tenant-scoped)
- Ensure employee is not soft-deleted

### Records not appearing in Attendance page
- Check date filter — records are date-scoped
- Check source badge — filter by `IMPORT` to see ingested records
- Verify the external system is sending to the correct HRMS instance

### Payroll not picking up attendance
- Ensure attendance records have `date` within the payroll period
- Ensure `hours` field is populated (or computed from timeIn/timeOut)
- Check `AttendanceRule` is configured for the tenant

---

## Environment Variables

### Backend

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `BIOMETRIC_PUNCH_KEY` | Optional shared secret for public kiosk punch |
| `TRUST_PROXY` | Set for on-premise IP allowlist checks |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | Backend API base URL (e.g., `http://localhost:4000/api/v1`) |

---

## Security Notes

- API keys are SHA-256 hashed in the database
- Raw keys are shown only once at creation
- All ingestion endpoints are rate-limited
- Tenant isolation is enforced at the middleware level
- Scope enforcement prevents key misuse
- Audit logs record all ingestion attempts
