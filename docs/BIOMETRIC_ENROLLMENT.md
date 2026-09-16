# Biometric Enrollment System

## Overview

The LGU HRMS biometric subsystem has **two distinct enrollment paths**:

1. **Biometric Credential Enrollment** — fingerprint/device credential linked to an employee
2. **Biometric Device Enrollment** — ZK terminal registration for automated attendance sync

There is also an **implicit employee-to-device mapping** that requires manual ZK terminal configuration.

---

## 1. Biometric Credential Enrollment (Web/Fingerprint)

### Who enrolls

The **employee themselves**, via the **Attendance Portal** (`/attendance-portal`).

### Entry point

`frontend/src/pages/AttendancePortal.jsx:125-140`

### Flow

```
Employee clicks "Enroll New" in Attendance Portal
  → Modal asks for optional device name
  → Frontend generates random credentialId + publicKey
  → POST /biometric/enroll { credentialId, publicKey, deviceName }
    [requireAuth — any authenticated user]
  → biometricController.enroll()
    → Resolves employee from req.user.externalId → Employee.employeeNumber
    → biometricService.enroll()
      → Checks credentialId not already enrolled
      → Creates BiometricCredential { employeeId, credentialId, publicKey, deviceName }
  → Returns credential record
```

### Key files

| File | Role |
|------|------|
| `backend/src/routes/biometric.js:9` | `POST /enroll` route |
| `backend/src/controllers/biometricController.js:7-28` | Resolves employee linkage, calls service |
| `backend/src/services/biometricService.js:6-20` | Dedup check, creates `BiometricCredential` |
| `backend/src/repositories/biometricRepository.js:19-23` | `prisma.biometricCredential.create()` with `stampTenant` |
| `backend/src/shared/contracts/biometric.js:3-7` | Schema: `deviceName` optional |
| `frontend/src/pages/AttendancePortal.jsx:125-140` | Enroll modal + API call |
| `frontend/src/api/biometric.js:7` | `biometricApi.enroll()` wrapper |

### Schema

```js
// backend/src/shared/contracts/biometric.js
export const enrollBiometricSchema = {
  body: z.object({
    deviceName: z.string().max(255).optional().nullable(),
  }),
};
```

> Note: `credentialId` and `publicKey` are **not** validated by Zod — they're only checked manually in the controller.

### Authorization

- Route: `POST /biometric/enroll`
- Auth: `requireAuth` (any authenticated user)
- RBAC: No role gate — any user can enroll
- Tenant: Scoped via `withTenant(req)` + `stampTenant(req)`

### Employee linkage

The controller resolves the employee from the logged-in user:

```js
// biometricController.js:9-16
const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
if (!user?.externalId) return 404; // Employee linkage not found
const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
if (!employee) return 404; // Employee not found
```

`User.externalId` must equal `Employee.employeeNumber` for enrollment to work.

### Service logic

```js
// biometricService.js:6-20
async enroll(req, employeeId, credentialId, publicKey, deviceName) {
  const existing = await prisma.biometricCredential.findFirst({
    where: withTenant(req, { credentialId })
  });
  if (existing) throw new Error('Credential already enrolled');

  return biometricRepository.create(req, {
    employeeId,
    credentialId,
    publicKey,
    deviceName: deviceName || null,
  });
}
```

### Frontend enrollment flow

```jsx
// AttendancePortal.jsx:125-140
const handleEnroll = async () => {
  const credentialId = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const publicKey = `publicKey_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const res = await biometricApi.enroll(credentialId, publicKey, enrollDeviceName.trim() || undefined);
  toast('Fingerprint enrolled successfully', 'success');
  loadCredentials();
};
```

> The frontend generates `credentialId` and `publicKey` client-side. These are **not** derived from actual biometric data — they're placeholder identifiers for the credential record.

---

## 2. Biometric Device Enrollment (ZK Terminal Management)

### Who enrolls

**ADMIN** only, via the **Devices page** (`/biometric-devices`).

### Entry point

`frontend/src/pages/Devices.jsx`

### Flow

```
ADMIN creates device record
  → POST /biometric-devices { name, model, protocol, host, port, serial, active }
    [requireRole('ADMIN')]
  → Creates BiometricDevice row { tenantId, host, port, serial, active }

ADMIN triggers sync
  → POST /biometric-devices/:id/sync
    → deviceSyncService.syncDevice()
      → pullZkAttendance({ host, port }) — ZK TCP protocol on port 4370
      → Normalizes logs: { deviceLogId, userId, punchedAt, verification }
      → ingestLogs():
        → Dedupes by [deviceId, deviceLogId]
        → Maps device userId → Employee.employeeNumber
        → Applies punches via attendanceService.devicePunch()
```

### Key files

| File | Role |
|------|------|
| `backend/src/routes/biometricDevices.js` | CRUD + sync for `BiometricDevice` |
| `backend/src/services/deviceSyncService.js` | Poller, ZK pull, log ingestion |
| `backend/src/lib/zkteco.js` | Raw ZK TCP adapter (port 4370) |
| `backend/src/shared/contracts/biometricDevices.js` | Device schemas |
| `frontend/src/pages/Devices.jsx` | Device management UI |
| `frontend/src/api/biometricDevices.js` | Device API wrappers |

### Device schema

```js
// backend/src/shared/contracts/biometricDevices.js
const createDeviceSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  model: z.string().max(80).trim().optional().nullable(),
  protocol: z.enum(['ZK_TCP']).optional().default('ZK_TCP'),
  host: hostField, // IP or hostname, no spaces
  port: z.number().int().min(1).max(65535).optional().default(4370),
  serial: z.string().max(80).trim().optional().nullable(),
  active: z.boolean().optional().default(true),
  pollIntervalMs: z.number().int().min(5000).max(600000).optional().default(30000),
});
```

### ZK TCP pull

```js
// backend/src/lib/zkteco.js
export async function pullZkAttendance({ host, port = 4370, timeoutMs = 12000 } = {}) {
  const { default: Zkteco } = await import('zkteco-js');
  const device = new Zkteco(host, port, timeoutMs, 5000);

  await withTimeout(() => device.createSocket(), timeoutMs, `connect ${host}:${port}`);
  try {
    try { await device.enableDevice(); } catch { /* non-fatal */ }
    const { data = [] } = await withTimeout(
      () => device.getAttendances(),
      timeoutMs * 3,
      `getAttendances ${host}:${port}`,
    );
    return data
      .map((r) => ({
        deviceLogId: r.sn != null ? String(r.sn) : '',
        userId: String(r.user_id ?? '').trim(),
        punchedAt: new Date(r.record_time),
        verification: r.type != null ? String(r.type) : null,
      }))
      .filter((r) => r.userId && r.punchedAt && !Number.isNaN(r.punchedAt.getTime()));
  } finally {
    try { await device.disconnect(); } catch { /* best-effort */ }
  }
}
```

### Log ingestion

```js
// backend/src/services/deviceSyncService.js:23-108
export async function ingestLogs(req, deviceId, logs) {
  // Dedup by [deviceId, deviceLogId]
  const existingRows = await prisma.biometricDeviceLog.findMany({ where: { deviceId } });
  const existingByKey = new Map(existingRows.map((l) => [l.deviceLogId, l]));
  const appliedKeys = new Set(existingRows.filter((l) => l.applied).map((l) => l.deviceLogId));

  // Cache employee lookups
  const employees = new Map();
  const getEmployee = async (userId) => {
    if (!userId) return null;
    if (employees.has(userId)) return employees.get(userId);
    const emp = await prisma.employee.findFirst({
      where: withTenant(req, { employeeNumber: userId }),
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
    });
    employees.set(userId, emp ?? null);
    return emp;
  };

  for (const log of logs) {
    const key = log.deviceLogId || `${log.punchedAt.getTime()}-${log.userId}`;
    // Skip duplicates and previously unmatched
    if (appliedKeys.has(key) || existing?.applied) continue;
    if (existing && !existing.employeeId) { stats.unmatched += 1; continue; }

    const employee = await getEmployee(log.userId);
    // Create BiometricDeviceLog row
    const row = await prisma.biometricDeviceLog.create({ data: { ... } });
    
    if (!employee) { stats.unmatched += 1; continue; }
    
    try {
      // Apply punch through same state machine as kiosk
      await attendanceService.devicePunch(req, employee.id, log.punchedAt, `DEVICE:${deviceId}:${key}`);
      await prisma.biometricDeviceLog.update({ where: { id: row.id }, data: { applied: true, employeeId: employee.id } });
    } catch (e) {
      stats.failed += 1;
      captureError(e, req); // Leave row for retry
    }
  }
}
```

### Auto-polling

```js
// backend/src/services/deviceSyncService.js:152-181
let pollTimer = null;
let running = new Set();

async function pollOnce() {
  const devices = await prisma.biometricDevice.findMany({ where: { active: true } });
  for (const device of devices) {
    if (running.has(device.id)) continue;
    running.add(device.id);
    syncDevice(virtualReq(device.tenantId), device)
      .catch((e) => captureError(e))
      .finally(() => running.delete(device.id));
  }
}

export function startBiometricPoller() {
  if (pollTimer) return pollTimer;
  const interval = Math.max(5000, Number(process.env.BIOMETRIC_POLL_MS) || 30000);
  pollTimer = setInterval(pollOnce, interval);
  pollTimer.unref?.();
  pollOnce().catch((e) => captureError(e));
  return pollTimer;
}
```

- Enabled by `BIOMETRIC_POLLER=1` in `backend/.env`
- Default interval: 30s (`BIOMETRIC_POLL_MS`)
- Started in `backend/src/server.js:8`
- Concurrent-safe via `running` Set

### Dev-only event injection

```js
// backend/src/routes/dev.js
router.post('/device-events', injectDeviceEventsSchema, async (req, res, next) => {
  // Feeds synthetic punch events through the SAME ingestLogs path
  // No hardware needed for development
});
```

---

## 3. Employee ↔ Device UserID Mapping

### How it works

ZK terminals store a numeric `userId` per fingerprint. The system maps this **implicitly**:

- `deviceSyncService.js:32-41` — looks up `Employee.employeeNumber` matching the device `userId`
- **No explicit enrollment table** — mapping is implicit: device `userId` must equal `Employee.employeeNumber`

### Current limitations

- No UI to pre-map device user IDs to employees
- The device must be configured so its internal user IDs match `Employee.employeeNumber` values (e.g., `EMP-DEFAULT-0001`)
- The `Users.jsx:532` tooltip hints at this: *"set the employee's user ID on the device to their HRMS employee number"*

---

## 4. Punch Verification Flow

### Biometric verify + optional punch

```js
// biometricController.js:30-48
async verify(req, res, next) {
  const { credentialId, assertion, punchType } = req.body;
  const result = await biometricService.verify(req, credentialId, assertion);
  
  if (punchType) {
    const attendanceResult = await attendanceService.biometricPunch(req, result.employeeId, punchType);
    return res.json({ ...attendanceResult, verified: true, employee: result });
  }
  res.json({ verified: true, ...result });
}
```

### Verify service

```js
// biometricService.js:22-35
async verify(req, credentialId, assertion) {
  const credential = await biometricRepository.findByCredentialId(req, credentialId);
  if (!credential) throw new Error('Credential not found');

  await biometricRepository.updateCounter(req, credentialId, (credential.counter || 0) + 1);
  return {
    valid: true,
    employeeId: credential.employeeId,
    employeeNumber: credential.employee?.employeeNumber,
    employeeName: `${credential.employee?.firstName ?? ''} ${credential.employee?.lastName ?? ''}`.trim(),
  };
}
```

---

## 5. Public Kiosk Punch (No Login)

### Route

`POST /attendance/public-punch/punch`

### Entry point

`frontend/src/pages/AttendancePortal.jsx:88-111` (Kiosk Mode)

### Flow

```
No JWT required
  → employeeNumber, punchType, tenantCode required
  → Optional: punchKey (shared secret), deviceId
  → Resolves tenant from tenantCode
  → Validates punchKey if configured
  → Finds employee by employeeNumber
  → attendanceService.biometricPunch(req, employee.id, punchType)
```

### Schema

```js
// backend/src/shared/contracts/attendance.js
export const punchBiometricPublicSchema = {
  body: z.object({
    employeeNumber: z.string().min(1),
    punchType: z.enum(['IN', 'OUT']),
    tenantCode: z.string().min(1),
    punchKey: z.string().optional(),
    deviceId: z.string().optional(),
  }),
};
```

### Rate limiting

- `punchLimiter` — tighter bucket for unauthenticated public punch kiosk
- Defined in `backend/src/middleware/rateLimit.js:54-58`

---

## 6. Database Schema

### BiometricCredential

```prisma
model BiometricCredential {
  id           String   @id @default(uuid())
  tenantId     String?
  employeeId   String
  credentialId String   @unique
  publicKey    String
  deviceName   String?
  counter      Int      @default(0)
  enrolledAt   DateTime @default(now()) @db.Timestamptz(6)
  lastUsedAt   DateTime? @db.Timestamptz(6)
  employee     Employee @relation(fields: [employeeId], references: [id])
  tenant       Tenant?  @relation(fields: [tenantId], references: [id])
}
```

### BiometricDevice

```prisma
model BiometricDevice {
  id             String   @id @default(uuid())
  tenantId       String?
  name           String
  model          String?
  protocol       String?  @default("ZK_TCP")
  host           String
  port           Int      @default(4370)
  serial         String?
  active         Boolean  @default(true)
  pollIntervalMs Int      @default(30000)
  lastSyncAt     DateTime? @db.Timestamptz(6)
  lastConnectedAt DateTime? @db.Timestamptz(6)
  lastError      String?
  createdAt      DateTime @default(now()) @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @db.Timestamptz(6)
  tenant         Tenant?  @relation(fields: [tenantId], references: [id])
}
```

### BiometricDeviceLog

```prisma
model BiometricDeviceLog {
  id          String   @id @default(uuid())
  tenantId    String?
  deviceId    String
  deviceLogId String
  userId      String
  punchedAt   DateTime @db.Timestamptz(6)
  verification String?
  employeeId  String?
  applied     Boolean  @default(false)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  
  @@unique([deviceId, deviceLogId])
  @@index([tenantId, deviceId])
}
```

---

## 7. Authorization Matrix

| Endpoint | Method | Auth | RBAC | Tenant Scope |
|----------|--------|------|------|--------------|
| `/biometric/enroll` | POST | `requireAuth` | None | Current user's tenant |
| `/biometric/verify` | POST | `requireAuth` | None | Current user's tenant |
| `/biometric/credentials` | GET | `requireAuth` | None (self) / ADMIN (any employee) | Current user's tenant |
| `/biometric/credentials/:credentialId` | DELETE | `requireAuth` | None | Current user's tenant |
| `/biometric-devices` | GET | `requireAuth` | `requireRole('ADMIN')` | Current user's tenant |
| `/biometric-devices` | POST | `requireAuth` | `requireRole('ADMIN')` | Current user's tenant |
| `/biometric-devices/:id` | PATCH | `requireAuth` | `requireRole('ADMIN')` | Current user's tenant |
| `/biometric-devices/:id` | DELETE | `requireAuth` | `requireRole('ADMIN')` | Current user's tenant |
| `/biometric-devices/:id/sync` | POST | `requireAuth` | `requireRole('ADMIN')` | Current user's tenant |
| `/attendance/public-punch/punch` | POST | None | None (rate-limited) | Resolved from `tenantCode` |

---

## 8. Known Gaps and Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | **No credentialId/publicKey validation in enrollment schema** — `enrollBiometricSchema` only validates `deviceName`; `credentialId` and `publicKey` are manually checked in the controller | Medium | `backend/src/shared/contracts/biometric.js:3-7` |
| 2 | **No employee-to-device userID mapping UI** — ZK terminal user IDs must manually match `Employee.employeeNumber`; no pre-assignment interface | Medium | `frontend/src/pages/Devices.jsx` |
| 3 | **SSO users can enroll biometrics** — SSO accounts have unusable password hashes but can still enroll fingerprint credentials | Low | `backend/src/controllers/biometricController.js:7-28` |
| 4 | **No enrollment audit distinction** — All biometric actions log as generic mutating requests; no specific `entity: 'BiometricCredential'` audit type | Low | `backend/src/middleware/audit.js` |
| 5 | **OIDC state/tickets in-memory** — `oidcStates` and `oidcTickets` are `Map()` instances; don't sync across PM2/cluster workers | Medium | `backend/src/controllers/authController.js:7-8` |
| 6 | **Temporary password in audit trail** — `safeBody()` strips `password` but not `temporaryPassword`; plaintext temp password stored in `AuditLog.after` | Medium | `backend/src/middleware/audit.js:83-86` |
| 7 | **Subdomain map drift** — `SUBDOMAIN_TENANT_MAP` maps `tarlac` → `tenant-tarlac`, but seed DB uses `tenant-solana` for SOLANA | Low | `backend/src/middleware/tenant.js:15-18` |
| 8 | **SSO default role is DEPARTMENT_HEAD** — If IdP groups don't match `GROUP_ROLE_MAP`, new SSO users get `DEPARTMENT_HEAD` by default | High | `backend/src/services/oidcService.js:126` |

---

## 9. Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `BIOMETRIC_PUNCH_KEY` | Shared secret for public kiosk punch endpoint | Empty (open) |
| `BIOMETRIC_POLLER` | Enable automatic ZK terminal polling | `0` (disabled) |
| `BIOMETRIC_POLL_MS` | Poll interval in milliseconds | `30000` (30s) |

---

## 10. Related Documentation

- `docs/DEVICES.md` — Biometric device workflow + architecture
- `docs/ATTENDANCE.md` — Attendance system walkthrough
- `docs/KIOSK.md` — Standalone kiosk deployment
- `AGENTS.md` — Biometric device sync section
