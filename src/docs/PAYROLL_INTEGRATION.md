# Payroll Integration Guide

## Overview

Connect `lgu-payroll` (or any external payroll system) to LGU-HRMS as a read-only data source. HRMS exposes employee master data, attendance records, leave requests and credits, payroll runs, periods, and payslips through API-key-authenticated endpoints under `/api/v1/integrations/`.

**Architecture:** HRMS is the payroll data source. `lgu-payroll` pulls employee, attendance, leave, and payroll data from HRMS. Attendance can also be pushed back into HRMS.

**Auth:** All endpoints require an API key (`x-api-key` header) with the appropriate scope. No JWT required.

**In-app setup:** `Settings → Integrations` now runs a six-step wizard (choose system → register it → issue the key → verify with a live probe → subscribe to events → monitor). This document is the API reference the wizard walks you through. See `src/docs/INTEGRATION_SETUP.md`.

---

## 1. Prerequisites

- SUPER_ADMIN role in HRMS (all `/integrations` management routes — keys, webhooks, external systems, catalog — are `requireRole('SUPER_ADMIN')`; the tab is hidden for other roles)
- Access to HRMS Settings → Integrations
- `lgu-payroll` server reachable from the HRMS network (for webhooks, optional)
- API key created with `payroll:read` scope (and `payroll:write` if pushing attendance)

---

## 2. Create an API Key for Payroll

### 2.1 Via HRMS UI

1. Log into HRMS as SUPER_ADMIN
2. Go to **Settings → Integrations** — the **Setup** tab opens the wizard, the **Advanced** tab is the raw list view
3. **Step 1 — Choose:** pick `PAYROLL`
4. **Step 2 — System:** create the external system record (name, base URL of the lgu-payroll instance)
5. **Step 3 — Credentials:** click *Create API key*. The wizard pre-selects the payroll scope bundle:
   - `payroll:read` — required for all payroll data endpoints
   - `employees:read` — required for employee master data
   - `attendance:read` — recommended, for attendance records
   - `attendance:ingest` — recommended, only if lgu-payroll pushes attendance back to HRMS
   - `leave:read` — recommended, for leave requests and credits
6. **Step 4 — Verify:** paste the key once and run the connectivity + scoped-read probes. Both must pass before the wizard marks the setup verified.
7. **Step 5 — Events (optional):** subscribe to `payroll.run.*` / `payroll.payslip.*` and copy the HMAC secret
8. The raw key is displayed **once** — copy it before closing the dialog

Scope names are validated against the server catalog; an unknown scope is rejected with 400 instead of silently 403-ing later.

### 2.2 Via API

```bash
POST /api/v1/integrations/keys
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{
  "name": "lgu-payroll",
  "scopes": ["payroll:read", "employees:read", "attendance:read"]
}
```

**Response:**
```json
{
  "id": "key-uuid",
  "name": "lgu-payroll",
  "scopes": ["payroll:read", "employees:read", "attendance:read"],
  "isActive": true,
  "createdAt": "2026-09-24T10:00:00.000Z"
}
```

The actual API key secret is returned only on creation. Store it securely.

### 2.3 Required Scopes

| Scope | Required For |
|-------|-------------|
| `payroll:read` | `GET /integrations/payroll/runs`, `/periods`, `/payslips`, `/runs/:id` |
| `employees:read` | `GET /integrations/employees` |
| `attendance:read` | `GET /integrations/attendance` |
| `attendance:ingest` | `POST /integrations/attendance/punch`, `/bulk` |
| `leave:read` | `GET /integrations/leave/requests`, `/credits` |
| `loans:read` | `GET /integrations/loans` (loan amortization schedules for deduction) |

**Note:** `payroll:write` scope does not currently grant additional endpoints. It is reserved for future write operations.

**Scope enforcement:** every data route sits behind `requireApiKey` + `requireScope('<scope>')` in `backend/src/routes/integrations.js`, so a key without the scope gets 403 `FORBIDDEN` with a `Missing scopes: …` message, regardless of tenant. Use the step-4 probe (or `GET /integrations/payroll/test`) to confirm before going live.

---

## 3. Configure lgu-payroll

### 3.1 Environment Variables

In the `lgu-payroll` `.env` or configuration:

```env
HRMS_BASE_URL=http://localhost:4000
HRMS_API_KEY=<api-key-created-in-step-2>
HRMS_TENANT_CODE=default
```

- `HRMS_BASE_URL`: Base URL of the HRMS API (e.g., `https://hrms.lgu.gov.ph`)
- `HRMS_API_KEY`: The API key secret created in Step 2
- `HRMS_TENANT_CODE`: The tenant code for multi-tenant resolution (default: `default`)

### 3.2 Configure the API Key Header

All requests from `lgu-payroll` to HRMS must include:

```
x-api-key: <HRMS_API_KEY>
```

---

## 4. Test the Connection

### 4.1 Connectivity Check

```bash
curl -H "x-api-key: <HRMS_API_KEY>" \
  http://localhost:4000/api/v1/integrations/payroll/test
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Payroll integration endpoint reachable",
  "tenantId": "tenant-default"
}
```

### 4.2 Verify Scopes

```bash
curl -H "x-api-key: <HRMS_API_KEY>" \
  http://localhost:4000/api/v1/integrations/attendance/test
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Attendance ingestion endpoint reachable",
  "tenantId": "tenant-default"
}
```

If you get a `401` or `403`, verify:
- The API key is active
- The key has the required scopes
- The key belongs to the correct tenant

---

## 5. Pull Employee Master Data

### 5.1 List Employees

```bash
GET /api/v1/integrations/employees?page=1&limit=50&search= Santos
```

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | 1000 | Page number |
| `limit` | integer | 50 | 200 | Records per page |
| `search` | string | — | — | Search by first name, last name, or employee number |

**Response:**
```json
{
  "items": [
    {
      "id": "emp-uuid",
      "employeeNumber": "EMP-DEFAULT-0001",
      "firstName": "Maria",
      "lastName": "Santos",
      "middleName": "L.",
      "birthDate": "1985-03-15T00:00:00.000Z",
      "gender": "Female",
      "civilStatus": "Single",
      "address": "Tarlac City, Tarlac",
      "contactNumber": "09489522797",
      "email": "maria.santos@default.gov.ph",
      "status": "ACTIVE",
      "monthlySalary": "50000.00",
      "keyPosition": "HRMO",
      "sssNumber": "SSS-123456789",
      "philhealthNumber": "PH-987654321",
      "pagibigNumber": "HD-456789123",
      "tinNumber": "TIN-123-456-789",
      "bankAccount": "1234567890",
      "bankName": "Land Bank of the Philippines",
      "department": {
        "id": "dept-uuid",
        "name": "Provincial Human Resource Management Office",
        "code": "PPHRMO-DEFAULT"
      },
      "position": {
        "id": "pos-uuid",
        "title": "Provincial HRMO"
      },
      "hiredDate": "2010-06-01T00:00:00.000Z",
      "createdAt": "2020-01-01T00:00:00.000Z",
      "updatedAt": "2026-09-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

**Payroll-critical fields:**
- `monthlySalary` (Decimal 12,2) — source of truth for payroll computation
- `status` — only process `ACTIVE` employees
- `sssNumber`, `philhealthNumber`, `pagibigNumber`, `tinNumber` — statutory contributions
- `bankAccount`, `bankName` — bank export (LDDAP)
- `department`, `position` — reporting and costing

### 5.2 List Departments

```bash
GET /api/v1/integrations/departments?page=1&limit=200
```

---

## 6. Pull Attendance Data

### 6.1 List Attendance by Date Range

```bash
GET /api/v1/integrations/attendance?startDate=2026-09-01&endDate=2026-09-30&employeeNumber=EMP-DEFAULT-0001&page=1&limit=200
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (YYYY-MM-DD) | Yes | Start of date range |
| `endDate` | string (YYYY-MM-DD) | Yes | End of date range |
| `employeeNumber` | string | No | Filter by employee |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Records per page (default: 200, max: 500) |

**Response:**
```json
{
  "items": [
    {
      "id": "att-uuid",
      "employeeNumber": "EMP-DEFAULT-0001",
      "firstName": "Maria",
      "lastName": "Santos",
      "middleName": "L.",
      "department": {
        "id": "dept-uuid",
        "name": "Provincial HRMO",
        "code": "PPHRMO-DEFAULT"
      },
      "position": {
        "id": "pos-uuid",
        "title": "Provincial HRMO"
      },
      "date": "2026-09-20",
      "timeIn": "2026-09-20T00:00:00.000Z",
      "timeOut": "2026-09-20T09:00:00.000Z",
      "hours": 9,
      "remark": null,
      "source": "IMPORT"
    }
  ],
  "total": 13,
  "page": 1,
  "limit": 200
}
```

### 6.2 Push Attendance to HRMS

If `lgu-payroll` computes attendance externally and needs to write back:

**Single punch:**
```bash
POST /api/v1/integrations/attendance/punch
Content-Type: application/json
x-api-key: <HRMS_API_KEY>

{
  "employeeNumber": "EMP-DEFAULT-0001",
  "punchType": "IN",
  "at": "2026-09-20T08:00:00Z",
  "source": "PAYROLL"
}
```

**Bulk upload (max 1000 records):**
```bash
POST /api/v1/integrations/attendance/bulk
Content-Type: application/json
x-api-key: <HRMS_API_KEY>

{
  "records": [
    {
      "employeeNumber": "EMP-DEFAULT-0001",
      "date": "2026-09-20",
      "timeIn": "08:00",
      "timeOut": "17:00",
      "hours": 9,
      "remark": "Regular",
      "source": "PAYROLL"
    }
  ]
}
```

---

## 7. Pull Payroll Data

### 7.1 List Payroll Periods

```bash
GET /api/v1/integrations/payroll/periods?page=1&limit=50&status=OPEN&fiscalYear=2026
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Records per page (default: 50, max: 500) |
| `status` | string | Filter by status: `OPEN`, `CLOSED` |
| `fiscalYear` | integer | Filter by fiscal year (2000–2100) |

**Response:**
```json
{
  "items": [
    {
      "id": "period-2026-09-DEFAULT",
      "name": "2026-09 Payroll",
      "startDate": "2026-09-01",
      "endDate": "2026-09-30",
      "fiscalYear": 2026,
      "status": "OPEN",
      "closedAt": null
    }
  ],
  "total": 1
}
```

### 7.2 List Payroll Runs

```bash
GET /api/v1/integrations/payroll/runs?page=1&limit=20&status=DRAFT&periodId=period-2026-09-DEFAULT
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Records per page (default: 50, max: 500) |
| `status` | string | Filter by status: `DRAFT`, `APPROVED`, `POSTED` |
| `periodId` | string | Filter by period ID |
| `runDate` | string (YYYY-MM-DD) | Filter by run date |

**Response:**
```json
{
  "items": [
    {
      "id": "run-uuid",
      "periodId": "period-2026-09-DEFAULT",
      "periodName": "2026-09 Payroll",
      "runDate": "2026-09-30",
      "status": "POSTED",
      "createdAt": "2026-09-30T10:00:00.000Z",
      "itemCount": 50,
      "totalNetPay": 2500000.00
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 7.3 Get Payroll Run Detail

```bash
GET /api/v1/integrations/payroll/runs/:id
```

**Response:**
```json
{
  "id": "run-uuid",
  "periodId": "period-2026-09-DEFAULT",
  "periodName": "2026-09 Payroll",
  "runDate": "2026-09-30",
  "status": "POSTED",
  "createdAt": "2026-09-30T10:00:00.000Z",
  "items": [
    {
      "id": "item-uuid",
      "employeeId": "emp-uuid",
      "employeeNumber": "EMP-DEFAULT-0001",
      "employeeName": "Maria Santos",
      "department": "Provincial HRMO",
      "position": "Provincial HRMO",
      "basicPay": 50000.00,
      "allowances": 5000.00,
      "deductions": 8000.00,
      "netPay": 47000.00,
      "deductionLines": [
        {
          "id": "line-uuid",
          "code": "SSS",
          "description": "SSS Contribution",
          "employeeShare": 2000.00,
          "quantity": null
        }
      ]
    }
  ]
}
```

### 7.4 List Payslips

```bash
GET /api/v1/integrations/payroll/payslips?runId=run-uuid&employeeNumber=EMP-DEFAULT-0001&page=1&limit=50
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `runId` | string | Filter by payroll run ID |
| `employeeNumber` | string | Filter by employee number |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Records per page (default: 50, max: 500) |

**Response:**
```json
{
  "items": [
    {
      "id": "item-uuid",
      "runId": "run-uuid",
      "periodName": "2026-09 Payroll",
      "runDate": "2026-09-30",
      "runStatus": "POSTED",
      "employeeNumber": "EMP-DEFAULT-0001",
      "employeeName": "Maria Santos",
      "department": "Provincial HRMO",
      "position": "Provincial HRMO",
      "basicPay": 50000.00,
      "allowances": 5000.00,
      "deductions": 8000.00,
      "netPay": 47000.00,
      "createdAt": "2026-09-30T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### 7.5 List Leave Requests

```bash
GET /api/v1/integrations/leave/requests?status=APPROVED&startDate=2026-09-01&endDate=2026-09-30&page=1&limit=50
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum | `PENDING\|APPROVED\|REJECTED\|CANCELLED` (optional) |
| `type` | enum | `VACATION\|SICK\|EMERGENCY\|OFFICIAL\|OTHER` (optional) |
| `employeeNumber` | string | Single-employee filter (optional) |
| `startDate` | `YYYY-MM-DD` | Keep requests that **overlap** this window (optional) |
| `endDate` | `YYYY-MM-DD` | Overlap filter end (optional) |
| `page` / `limit` | integer | Page number / page size (default 1 / 50, max 200) |

The date filter is an **overlap** test (`startDate <= periodEnd AND endDate >= periodStart`), not a containment test, so a request spanning a month boundary is returned for both months.

**Response:**
```json
{
  "items": [
    {
      "id": "request-uuid",
      "employeeNumber": "EMP-DEFAULT-0001",
      "employeeName": "Maria Santos",
      "department": "Provincial HRMO",
      "position": "Provincial HRMO",
      "type": "VACATION",
      "startDate": "2026-09-01",
      "endDate": "2026-09-01",
      "days": 1,
      "status": "APPROVED",
      "remarks": null,
      "approvedAt": "2026-08-28T09:00:00.000Z",
      "createdAt": "2026-08-20T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### 7.6 List Leave Credits

```bash
GET /api/v1/integrations/leave/credits?year=2026&employeeNumber=EMP-DEFAULT-0002
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | integer | Credit year (default: current year) |
| `employeeNumber` | string | Single-employee filter (optional) |
| `page` / `limit` | integer | Page number / page size (default 1 / 50, max 200) |

**Response:**
```json
{
  "items": [
    {
      "id": "credit-uuid",
      "employeeNumber": "EMP-DEFAULT-0002",
      "employeeName": "Juan Dela Cruz",
      "department": "Finance",
      "position": "Accountant III",
      "type": "VACATION",
      "year": 2026,
      "entitled": 20,
      "used": 5,
      "balance": 15
    }
  ],
  "total": 6000,
  "page": 1,
  "limit": 50
}
```

> Credits are stored per employee × type × year, so `total` is large on a seeded tenant — always pass `employeeNumber` or a small `limit` when probing.

**Probe:** `POST /api/v1/integrations/leave/test` (no body) returns `{ "ok": true, "message": "Leave integration endpoint reachable", "tenantId": "..." }` after resolving the key. It is the `leave:read` equivalent of the payroll/attendance connectivity checks and is what wizard step 4 uses.

### 7.7 List Loans (for salary-deduction amortization)

```bash
GET /api/v1/integrations/loans?status=DISBURSED&employeeNumber=EMP-DEFAULT-0001&page=1&limit=50
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum | `PENDING\|APPROVED\|DISBURSED\|PAID\|CANCELLED` (optional) |
| `employeeNumber` | string | Single-employee filter (optional) |
| `page` / `limit` | integer | Page number / page size (default 1 / 50, max 500) |

**Response:**
```json
{
  "items": [
    {
      "id": "loan-uuid",
      "employeeNumber": "EMP-DEFAULT-0001",
      "employeeName": "Maria Santos",
      "type": "SALARY_ADVANCE",
      "amount": 24000.00,
      "termMonths": 12,
      "startDate": "2026-09-01",
      "status": "DISBURSED",
      "outstandingBalance": 20000.00,
      "amortizations": [
        { "id": "amort-uuid", "dueDate": "2026-09-01", "amount": 2000.00, "paid": true },
        { "id": "amort-uuid", "dueDate": "2026-10-01", "amount": 2000.00, "paid": false }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

Amortizations are equal monthly installments from `startDate` (the last absorbs the rounding remainder; month-end dates clamp to the last day of the month). `outstandingBalance` is the sum of unpaid installments. HRMS marks a run's due amortizations **PAID** automatically when lgu-payroll posts the payroll result (sync transition) — pull `paid` flags back before computing the next period's deductions.

---

## 8. Webhook Events (Optional)

### 8.1 Supported Payroll Events

HRMS can push real-time notifications to `lgu-payroll` via webhooks. Supported events:

| Event | Trigger | Payload |
|-------|---------|---------|
| `payroll.period.created` | Period mirrored from lgu-payroll (new) **or** created locally | `{ periodId, externalId?, name, fiscalYear }` |
| `payroll.period.closed` | Period closed in lgu-payroll and mirrored (sync transition) | `{ periodId, externalId?, name, status, closedAt }` |
| `payroll.run.created` | Run mirrored from lgu-payroll (new) | `{ runId, periodId, externalId?, status, runDate }` |
| `payroll.run.approved` | Run approved in lgu-payroll and mirrored (sync transition) | `{ runId, periodId, externalId?, status }` |
| `payroll.run.posted` | Run posted in lgu-payroll and mirrored (sync transition; also settles due loan amortizations) | `{ runId, periodId, externalId?, status, itemCount, totalNetPay }` |

Since the payroll delegation these events fire from `payrollAdapter.sync` **transitions only** — an idempotent re-sync that changes nothing dispatches nothing, so the reverse webhook (`lgu-payroll` → `POST /integrations/payroll/webhook` → sync) cannot loop.

### 8.2 Set Up Webhooks

**In HRMS:**
1. Go to **Settings → Integrations → Webhooks**
2. Click **Add Webhook**
3. Fill in:
   - **Name:** `lgu-payroll webhook`
   - **URL:** `http://<lgu-payroll-host>/api/v1/webhooks/hrms`
   - **Events:** Select the payroll events you need
   - **Secret:** Leave blank to auto-generate, or provide your own
4. Click **Add Webhook**
5. **Copy the secret** from the confirmation modal

**In `lgu-payroll` `.env`:**
```env
HRMS_WEBHOOK_SECRET=<secret-copied-from-HRMS>
```

**Webhook payload format:**
```json
{
  "event": "payroll.run.posted",
  "tenantId": "default",
  "runId": "run-uuid",
  "periodId": "period-2026-09-DEFAULT",
  "status": "POSTED",
  "itemCount": 50,
  "totalNetPay": 2500000.00,
  "timestamp": "2026-09-30T12:00:00.000Z"
}
```

**Verification:** HRMS signs every webhook with HMAC-SHA256. The signature is in the `X-HRMS-Signature` header. `lgu-payroll` must verify this signature before processing.

---

## 9. Data Flow Diagram

```
┌─────────────────┐         ┌──────────────────┐
│   lgu-payroll   │         │   LGU-HRMS       │
│  (external)     │         │  (this system)   │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │  1. x-api-key auth        │
         │  ─────────────────────►   │
         │                           │
         │  2. Pull employees        │
         │  GET /integrations/employees
         │  ─────────────────────►   │
         │                           │
         │  3. Pull attendance       │
         │  GET /integrations/attendance
         │  ─────────────────────►   │
         │                           │
         │  4. Push attendance       │
         │  POST /integrations/attendance/bulk
         │  ─────────────────────►   │
         │                           │
         │  5. Pull payroll runs     │
         │  GET /integrations/payroll/runs
         │  ─────────────────────►   │
         │                           │
         │  6. Pull payslips         │
         │  GET /integrations/payroll/payslips
         │  ─────────────────────►   │
         │                           │
         │  7. Webhook (optional)    │
         │  ◄────────────────────    │
         │  payroll.run.posted       │
         │                           │
```

---

## 10. Complete API Reference

### Endpoint Summary

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/integrations/payroll/test` | `payroll:read` or `payroll:write` | Connectivity check |
| `GET` | `/integrations/payroll/runs` | `payroll:read` | List payroll runs |
| `GET` | `/integrations/payroll/runs/:id` | `payroll:read` | Get run detail with items |
| `GET` | `/integrations/payroll/periods` | `payroll:read` | List payroll periods |
| `GET` | `/integrations/payroll/payslips` | `payroll:read` | List payslips |
| `GET` | `/integrations/employees` | `employees:read` | List employees |
| `GET` | `/integrations/departments` | `employees:read` | List departments |
| `GET` | `/integrations/attendance` | `attendance:read` or `attendance:ingest` | List attendance |
| `POST` | `/integrations/attendance/punch` | `attendance:ingest` | Single punch |
| `POST` | `/integrations/attendance/bulk` | `attendance:ingest` | Bulk attendance (max 1000) |
| `POST` | `/integrations/attendance/test` | `attendance:read` or `attendance:ingest` | Connectivity check |
| `POST` | `/integrations/leave/test` | `leave:read` | Leave connectivity check |
| `GET` | `/integrations/leave/requests` | `leave:read` | List leave requests |
| `GET` | `/integrations/leave/credits` | `leave:read` | List leave credits |
| `GET` | `/integrations/loans` | `loans:read` | List loans with amortization schedules |

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | API key missing a required scope (message lists the missing scopes) |
| 404 | `NOT_FOUND` | Resource not found |
| 400 | `VALIDATION_ERROR` | Invalid query/body/scope/event parameters |

---

## 11. Troubleshooting

### 401 Unauthorized
- Verify the `x-api-key` header is present
- Verify the API key has not been revoked
- Verify the API key is active (`isActive: true`)
- Verify the key hash matches (SHA-256 of the raw key)

### 403 Forbidden
- Verify the API key has the required scope for the endpoint
- Scopes are assigned at creation time; create a new key with the correct scopes

### 404 Not Found
- Verify the resource ID exists
- Verify the tenant ID matches the API key's tenant
- Verify `startDate`/`endDate` format is `YYYY-MM-DD`

### 400 Validation Error
- Verify query parameters match the expected format
- `page` must be a positive integer
- `limit` must be within the allowed range
- `startDate`/`endDate` must be valid dates

### Empty Results
- Verify the tenant has data (seeded employees, attendance, payroll runs)
- Verify date ranges are correct
- Verify `status` filters match existing records

---

## 12. Security Notes

- API keys are SHA-256 hashed in the database; the raw key is never stored
- Keys are tenant-scoped; one key cannot access another tenant's data
- All requests are logged; monitor for unusual access patterns
- Rotate API keys every 90 days
- Use `https://` in production; never send API keys over HTTP
- Webhook payloads are signed with HMAC-SHA256; always verify the signature
- Do not expose the API key in client-side code (browsers, mobile apps)

---

## 13. Related Documentation

- `src/docs/INTEGRATION_SETUP.md` — the six-step in-app setup wizard (Setup tab flow, catalog, readiness rules, adding a new type)
- `INTEGRATION_GUIDE.md` — General integration patterns (webhooks, polling)
- `src/docs/ADDING_EXTERNAL_SYSTEMS.md` — onboarding a new external system
- `src/docs/PAYROLL.md` — Payroll engine internals
- `src/docs/SETTINGS.md` — HRMS Settings page documentation
- `docs/ATTENDANCE_INTEGRATION.md` — Attendance ingestion from external systems

---

## 14. Bidirectional Connection Setup (HRMS ↔ lgu-payroll)

This section covers connecting both systems for full bidirectional sync:
- **Forward:** lgu-payroll pulls employees, attendance, and payroll data from HRMS
- **Reverse:** HRMS pushes employee and attendance changes to lgu-payroll via webhooks
- **Auto-sync:** lgu-payroll triggers HRMS to pull payroll changes via webhook

### 14.1 Prerequisites

- Both HRMS and lgu-payroll backends running
- Docker running for database access
- API key in HRMS with scopes: `payroll:read`, `employees:read`, `attendance:read`, `attendance:ingest`
- API key in lgu-payroll with scope: `payroll:read`

### 14.2 Configure lgu-payroll

Edit `lgu-payroll/backend/.env`:

```env
HRMS_BASE_URL=http://localhost:4000
HRMS_API_KEY=<HRMS_API_KEY_from_section_2>
HRMS_WEBHOOK_SECRET=<webhook_secret_from_section_8>
HRMS_TENANT_ID=tenant-default
```

- `HRMS_BASE_URL`: Base URL of HRMS API
- `HRMS_API_KEY`: API key created in HRMS with payroll scopes
- `HRMS_WEBHOOK_SECRET`: Secret for verifying HRMS webhook signatures
- `HRMS_TENANT_ID`: The tenant ID in HRMS (e.g., `tenant-default`)

### 14.3 Apply lgu-payroll Database Migration

```bash
cd C:\Users\EngrBry\Desktop\lgu-payroll\backend
npx prisma migrate dev --name add_hrms_tenant_id
```

This adds the `hrmsTenantId` field to `IntegrationConfig`.

### 14.4 Update lgu-payroll IntegrationConfig

```bash
docker cp C:\Users\EngrBry\Desktop\Projects\lgu-hrms\backend\prisma\migrations\20260924180000_add_payroll_external_id\migration.sql lgu-payroll-db:/tmp/check.sql
docker exec lgu-payroll-db psql -U postgres -d lgu_payroll -f /tmp/check.sql
```

Or update via lgu-payroll admin interface if available.

### 14.5 Verify HRMS Webhook Endpoint

HRMS exposes a public webhook endpoint for lgu-payroll:

```
POST /api/v1/integrations/payroll/webhook
```

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: <HMAC-SHA256(payload, HRMS_API_KEY)>`

**Payload:**
```json
{
  "event": "payroll.run.posted",
  "data": {
    "runId": "run-uuid",
    "periodId": "period-uuid",
    "status": "POSTED",
    "itemCount": 50,
    "totalNetPay": 2500000.00
  },
  "tenantId": "tenant-default",
  "occurredAt": "2026-09-30T12:00:00.000Z"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Payroll sync triggered",
  "sync": {
    "processed": 5,
    "created": 0,
    "updated": 5,
    "errors": 0
  }
}
```

### 14.6 Verify Reverse Webhook Flow

HRMS dispatches webhooks on attendance and employee changes:

| Event | Trigger | Payload |
|-------|---------|---------|
| `employee.created` | New employee created in HRMS | `{ employeeId, employeeNumber, firstName, lastName, ... }` |
| `employee.updated` | Employee updated in HRMS | `{ employeeId, employeeNumber, firstName, lastName, ... }` |
| `employee.deleted` | Employee soft-deleted in HRMS | `{ employeeNumber }` |
| `attendance.created` | Attendance record created/ingested | `{ attendanceId, employeeId, date, timeIn, timeOut, hours }` |
| `attendance.updated` | Attendance record updated | `{ attendanceId, employeeId, date, timeIn, timeOut, hours }` |
| `attendance.bulk_updated` | Bulk attendance import | `{ count, records: [...] }` |

lgu-payroll receives these at its webhook endpoint and processes them via `syncService.handleWebhook()`.

### 14.7 Configure HRMS External System for lgu-payroll

In HRMS, ensure an `ExternalSystem` record exists for lgu-payroll:

```bash
POST /api/v1/integrations/external-systems
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{
  "name": "lgu-payroll",
  "type": "PAYROLL",
  "baseUrl": "http://localhost:4101",
  "apiKey": "<lgu-payroll API key>",
  "isActive": true
}
```

### 14.8 Create Webhook in HRMS for lgu-payroll

In HRMS UI:
1. Go to **Settings → Integrations → Webhooks**
2. Click **Add Webhook**
3. Fill in:
   - **Name:** `lgu-payroll sync`
   - **URL:** `http://localhost:4101/api/v1/sync/webhook`
   - **Events:** Select `payroll.period.created`, `payroll.period.closed`, `payroll.run.created`, `payroll.run.approved`, `payroll.run.posted`
   - **Secret:** Auto-generate or provide your own
4. Click **Add Webhook**
5. **Copy the webhook secret** and add it to lgu-payroll `.env` as `HRMS_WEBHOOK_SECRET`

### 14.9 Test the Bidirectional Flow

**Test 1: lgu-payroll → HRMS (forward sync)**

```bash
# In HRMS, trigger payroll sync
curl -X POST http://localhost:4000/api/v1/payroll/sync-from-payroll \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Test 2: HRMS → lgu-payroll (reverse webhook)**

```bash
# In HRMS, create an employee
curl -X POST http://localhost:4000/api/v1/employees \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNumber": "EMP-TEST-001",
    "firstName": "Test",
    "lastName": "User",
    "departmentId": "dept-uuid",
    "positionId": "pos-uuid",
    "monthlySalary": 50000
  }'
```

Verify in lgu-payroll:
```bash
docker exec lgu-payroll-db psql -U postgres -d lgu_payroll -c "SELECT * FROM \"Employee\" WHERE \"employeeNumber\" = 'EMP-TEST-001';"
```

**Test 3: lgu-payroll → HRMS webhook trigger**

```bash
# In lgu-payroll, create a payroll run
curl -X POST http://localhost:4101/api/v1/payroll \
  -H "Authorization: Bearer <lgu-payroll-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2026-10",
    "name": "October 2026",
    "status": "DRAFT"
  }'
```

Verify in HRMS that the webhook triggered and payroll data was synced.

### 14.10 Verify Connection Status

**HRMS side:**
```bash
# Check external system
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  http://localhost:4000/api/v1/integrations/external-systems

# Check webhooks
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  http://localhost:4000/api/v1/integrations/webhooks

# Check sync logs
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  http://localhost:4000/api/v1/integrations/requests
```

**lgu-payroll side:**
```bash
# Check sync logs
curl -H "Authorization: Bearer <lgu-payroll-admin-token>" \
  http://localhost:4101/api/v1/sync/logs

# Check integration config
curl -H "Authorization: Bearer <lgu-payroll-admin-token>" \
  http://localhost:4101/api/v1/sync/config
```

---

## 15. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Bidirectional Sync                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐                    ┌──────────────────┐
│   lgu-payroll   │                    │   LGU-HRMS       │
│  (external)     │                    │  (this system)   │
└────────┬────────┘                    └────────┬─────────┘
         │                                      │
         │  1. Pull employees/attendance         │
         │  GET /integrations/employees          │
         │  GET /integrations/attendance         │
         │  ─────────────────────────────────►   │
         │                                      │
         │  2. Push attendance                   │
         │  POST /integrations/attendance/bulk   │
         │  ─────────────────────────────────►   │
         │                                      │
         │  3. Pull payroll changes              │
         │  POST /integrations/payroll/changes   │
         │  ─────────────────────────────────►   │
         │                                      │
         │  4. Webhook trigger (auto-sync)       │
         │  ◄────────────────────────────────   │
         │  POST /integrations/payroll/webhook   │
         │  (payroll.run.posted, etc.)           │
         │                                      │
         │  5. Reverse webhooks                  │
         │  ◄────────────────────────────────   │
         │  POST /api/v1/sync/webhook            │
         │  (employee.created/updated/deleted)   │
         │  (attendance.created/updated)         │
         │                                      │
         └──────────────────────────────────────┘
```

---

## 16. Security Considerations

- All HRMS → lgu-payroll webhooks are signed with HMAC-SHA256
- lgu-payroll → HRMS webhook endpoint validates signatures using the API key
- API keys are tenant-scoped and SHA-256 hashed in the database
- All sync events are logged in `SyncLog` and `AuditLog` tables
- Use HTTPS in production; never send secrets over HTTP
- Rotate webhook secrets and API keys regularly
