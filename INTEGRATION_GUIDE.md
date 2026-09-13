# LGU-HRMS Integrations Guide

## Overview
Link Employees 201 File to external HR systems: Prime HR, CSC Portal, Payroll, and custom HRIS.

HRMS is the employee data center. IMS mirrors employee data from HRMS via two mechanisms:
1. **Webhooks** (real-time push)
2. **Scheduled sync** (polling fallback)

---

## 1. Access Integration Settings
Settings → Integrations

---

## 2. API Keys
Create read/write keys for external consumers.
- Scope options: `employees:read`, `employees:write`, `payroll:read`
- Rotate every 90 days
- Keys are tenant-scoped

Example request:
```bash
curl -H "Authorization: Bearer <API_KEY>" \
  "https://hrms.lgu.gov.ph/api/v1/employees?salaryGrade=8&appointmentType=REGULAR"
```

---

## 3. Webhooks

### 3.1 Overview
HRMS pushes employee changes to IMS in real time using webhooks. When an employee is created, updated, or deleted in HRMS, the change is immediately sent to IMS via an HTTP POST request.

### 3.2 Supported Events
- `employee.created`
- `employee.updated`
- `employee.deleted`

### 3.3 Payload Format
```json
{
  "event": "employee.updated",
  "tenantId": "default",
  "employeeId": "emp_123",
  "employeeNumber": "2024-001",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "email": "juan.delacruz@lgu.gov.ph",
  "status": "ACTIVE",
  "changedFields": ["firstName", "email"],
  "timestamp": "2026-09-12T10:00:00.000Z",
  "actorUserId": "user_456"
}
```

### 3.4 Webhook Secret

The webhook secret is used for HMAC-SHA256 signature verification. HRMS signs every outgoing webhook with this secret; IMS verifies incoming webhooks using the same value.

#### How to get the secret

1. **Create the webhook in HRMS**:
   - Go to Settings → Integrations → Webhooks
   - Fill in Name, URL, and Events
   - Leave **Secret** blank to auto-generate a secure random secret
   - Click **Add Webhook**

2. **Copy the secret immediately**:
   - After creation, HRMS shows a **"Webhook Created"** modal with the secret
   - The secret is shown **only once**
   - Copy it and store it securely

3. **Paste into IMS `.env`**:
   ```env
   HRMS_WEBHOOK_SECRET=<paste-secret-here>
   ```

4. **Restart IMS backend** to pick up the new env var:
   ```bash
   cd lgu_ims/backend
   npm run dev
   ```

#### What if I lost the secret?

If you did not save the secret, you have two options:

1. **Rotate the secret** (recommended):
   - In HRMS → Integrations → Webhooks, find the webhook
   - Click the **Rotate secret** button (`RefreshCw` icon)
   - Confirm the rotation
   - Copy the new secret from the modal
   - Update `HRMS_WEBHOOK_SECRET` in IMS `.env` and restart IMS

2. **Delete and recreate**:
   - Delete the webhook in HRMS
   - Create a new webhook with a known secret
   - Update IMS `.env`

#### Secret requirements

- Minimum 48 characters recommended (HRMS auto-generates 48-char hex)
- Must match exactly on both systems
- Case-sensitive
- Use a different secret for each environment (dev/staging/prod)

### 3.5 How Webhooks Work

```
HRMS employee change
    │
    ▼
HRMS backend signs payload with HMAC-SHA256
    │
    ▼
HTTP POST → http://<your-ims-host>/api/v1/webhooks/hrms
    │
    ▼
IMS verifies HMAC signature using HRMS_WEBHOOK_SECRET
    │
    ▼
IMS updates local User record based on event type
```

**Step-by-step:**

1. **Employee change in HRMS**: An employee is created, updated, or deleted via HRMS API or UI
2. **HRMS dispatches webhook**: `employeeService.js` calls `dispatchWebhooks()` after the database transaction
3. **Payload is signed**: HMAC-SHA256 signature is generated using the webhook secret
4. **HTTP POST to IMS**: Sent to `http://<your-ims-host>/api/v1/webhooks/hrms` with headers:
   - `Content-Type: application/json`
   - `X-HRMS-Signature: <hmac-hex>`
   - `X-HRMS-Event: employee.updated`
5. **IMS verifies signature**: Recomputes HMAC using `HRMS_WEBHOOK_SECRET` from `.env`
6. **IMS processes event**: Creates, updates, or deactivates the local user
7. **Sync logged**: Every webhook sync is recorded in the `SyncRequest` table

### 3.6 IMS Webhook Receiver

- **URL**: `http://<your-ims-host>/api/v1/webhooks/hrms`
- **Authentication**: HMAC-SHA256 signature in `X-HRMS-Signature` header
- **No JWT required** — webhook endpoint is public but secured by signature
- **Rate limiting**: 30 requests/minute per IP
- **IP allowlisting**: Optional via `INTEGRATION_ALLOWED_IPS` env var

### 3.7 Setup Steps

1. **In IMS `.env`**, set the shared secret:
   ```env
   HRMS_WEBHOOK_SECRET=your-secret-here
   ```

2. **In HRMS**, create a webhook subscription:
   - URL: `http://<your-ims-host>/api/v1/webhooks/hrms`
   - Events: `employee.created`, `employee.updated`, `employee.deleted`
   - Copy the webhook secret

3. **In IMS `.env`**, use the same secret:
   ```env
   HRMS_WEBHOOK_SECRET=<same-secret-as-HRMS>
   ```

4. **Restart IMS backend**:
   ```bash
   cd lgu_ims/backend
   npm run dev
   ```

5. **Verify** the webhook is working:
   - In HRMS → Integrations → Webhooks, click "Test" on the webhook
   - IMS should receive the event and create/update the user
   - Check IMS logs for `[webhook]` messages

### 3.8 What IMS Does with Webhooks
| Event | IMS Action |
|-------|-----------|
| `employee.created` | Creates new IMS user with `externalId = employeeNumber` |
| `employee.updated` | Updates user's `fullName`, `email`, `isActive` |
| `employee.deleted` | Sets user `isActive = false` (soft delete) |

### 3.9 IMS Integration Config

IMS provides a unified integration configuration page at **Settings → Integrations**.

**Location:** IMS UI → Settings → Integrations tab

**Sections:**

1. **HRMS Connection**
   - Base URL
   - API Key (masked with reveal/copy)
   - Default role for new users
   - Default password for new users

2. **Webhook Receiver**
   - Receiver URL (auto-generated)
   - Webhook Secret (masked with reveal/copy)
   - Status badge: configured / not configured
   - Supported events list

3. **Scheduled Sync**
   - Cron expression input
   - Manual trigger button
   - Last run status and results

4. **IMS API Keys**
   - Create new key with name and expiry
   - List with status, type, expiry, last used
   - Toggle active/inactive
   - Delete permanently

**How to access:**
1. Log into IMS as admin
2. Go to Settings → Integrations
3. All integration settings are in one page

**Note:** The webhook secret is stored in IMS `.env` as `HRMS_WEBHOOK_SECRET` for production. The UI shows configuration status but does not store the secret in the database.

---

## 4. Scheduled Sync (Polling)

### 4.1 Overview
If webhooks fail or are not configured, IMS can poll HRMS on a schedule. The scheduler runs in the IMS backend and can be configured via the IMS UI or environment variables.

### 4.2 Configuration

**Via IMS UI (recommended):**
1. Go to IMS → Settings → Integrations → Scheduled Sync
2. Set the cron expression
3. Click **Save Config**

**Via environment variables:**
```env
HRMS_API_KEY=<hrms-api-key-created-in-HRMS>
HRMS_BASE_URL=http://localhost:4000
HRMS_SYNC_CRON=*/15 * * * *
```

- `HRMS_API_KEY`: API key created in HRMS → Settings → Integrations
- `HRMS_BASE_URL`: HRMS server URL
- `HRMS_SYNC_CRON`: Cron expression (default: every 15 minutes)

### 4.3 How It Works
- On IMS startup, scheduler starts after 30 seconds
- Runs on the configured cron schedule
- Fetches all employees from HRMS `/api/v1/integrations/employees`
- Upserts into IMS users
- Logs results to `SyncRequest` table

### 4.4 Manual Trigger
In IMS → Settings → Integrations → Scheduled Sync:
- Click **Sync now** to trigger an immediate sync
- View last run status and results

### 4.5 API Endpoints
```bash
# Get scheduler status
GET /api/v1/integrations/sync/status

# Trigger immediate sync
POST /api/v1/integrations/sync/trigger
```

---

## 5. External Systems Mapping
| System | Use case | Endpoint |
|--------|----------|----------|
| Prime HR | Sync 201 file | GET /api/v1/employees |
| CSC Portal | Eligibility push | Webhook employee.updated |
| Payroll | SG/Step sync | GET /api/v1/employees?salaryGrade=&appointmentType= |
| IMS | Inventory sync | GET /api/v1/integrations/employees |

---

## 6. URL Filters
Employees page persists filters in URL for sharing:
`/employees?q=2024-001&dept=...&sg=8&appt=REGULAR&page=2`

---

## 7. Security
- Tenant isolation enforced
- API keys hashed at rest
- Webhook signatures verified with HMAC-SHA256
- Audit log for all integration access
- Rate limiting on integration endpoints
- IP allowlisting configurable via `INTEGRATION_ALLOWED_IPS`

---

## 8. Environment Variables

### HRMS
```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/lgu_hrms"
JWT_SECRET=your-jwt-secret
```

### IMS
```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5433/lgu_ims"
JWT_SECRET=your-jwt-secret

# HRMS connection (can also be set via IMS Settings → Integrations)
HRMS_BASE_URL=http://localhost:4000
HRMS_API_KEY=<hrms-api-key>

# Webhook security (required for receiving webhooks from HRMS)
HRMS_WEBHOOK_SECRET=<shared-webhook-secret>

# Scheduler (can also be set via IMS Settings → Integrations)
HRMS_SYNC_CRON=*/15 * * * *

# Optional: IP allowlist for integration endpoints
INTEGRATION_ALLOWED_IPS=127.0.0.1,::1
```

**Note:** Most integration settings can now be configured via the IMS UI at Settings → Integrations. Environment variables are still used for:
- `HRMS_WEBHOOK_SECRET` (webhook signature verification)
- Database and JWT configuration

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not received | Check IMS logs for signature errors. Ensure `HRMS_WEBHOOK_SECRET` matches on both systems. |
| Scheduled sync not running | Verify `HRMS_API_KEY` is set in IMS `.env`. Check IMS logs for `[sync-scheduler]` messages. |
| Employee not syncing | Check that `employeeNumber` exists in HRMS and matches IMS `externalId`. |
| Duplicate users | IMS appends suffix if username/email clashes: `username-2`, `username-3`, etc. |
| Signature mismatch | Ensure `HRMS_WEBHOOK_SECRET` in IMS matches the webhook secret in HRMS. Rotate secret if needed. |

---

## Next Steps
- Add webhook retry/backoff for failed deliveries
- Add webhook delivery logs UI
- Add field-level change detection to reduce unnecessary updates
