# Biometric Device Sync (ZK TCP Pull)

How ZKTeco fingerprint terminals get their attendance logs into the HRMS DTR — no
login required at the terminal, same punch rules as the lobby kiosk.

## The pipeline

```
 ZK terminal            backend poller / manual sync          HRMS database
 ┌──────────┐   TCP     ┌─────────────────────────────┐   Prisma   ┌──────────────┐
 │ port 4370 │───logs──▶│ lib/zkteco.js (pullZk)      │──create──▶│BiometricDeviceLog│
 │           │          │  → normalized records       │           │ (deduped)    │
 └──────────┘          │  → deviceSyncService.ingest  │  ──apply──▶  attendanceService.devicePunch
                        └─────────────────────────────┘           └──────────────┘
                              │                                     │ creates/updates
                              │                                     ▼
                              │                              Attendance row
                              │                           source='DEVICE', deviceRef='DEVICE:<id>:<log>'
                              └── health: lastConnectedAt / lastError / lastSyncAt
```

### Event → DTR rules (identical to the kiosk)

- **Working day** is the Asia/Manila calendar day of the punch time
  (`backend/src/lib/time.js` `manilaDateKey`/`dateKeyToUtc`).
- **IN** (no open row): creates a new row, remark from the active
  `AttendanceRule` or `On leave` when an approved leave covers that date.
- **OUT** (latest open row): closes it with `timeOut`, computes `hours` minus
  the lunch window that falls inside the shift, remark `Completed`.
- **IN while open**: idempotent no-op (row already there). **OUT with no open
  row**: stays unmatched — recorded in `BiometricDeviceLog.applied=false`.
- Identity is **device `userId` == HRMS `Employee.employeeNumber`**. Set the
  user ID on the terminal provisioning screen; no mapping UI is needed.

## Setup

1. Put the terminal on the same LAN as the backend; note its IP and port (default **4370**).
2. On the terminal, set the clock to **Asia/Manila** and each employee's user ID to their employee number.
3. Add the device: `POST /api/v1/biometric-devices` or the **Biometric Devices** page (Administration).
4. Start the poller with `BIOMETRIC_POLLER=1` in `backend/.env`
   (`BIOMETRIC_POLL_MS` default 30000), or trigger one pull via **Sync** on the page / `POST /api/v1/biometric-devices/:id/sync`.
5. Watch the Health column: `Connected` + `lastSyncAt` after each round; any failure is
   recorded as a readable `lastError` on the row (no crash, poller keeps running).

## API

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/v1/biometric-devices` | ADMIN | list (tenant-scoped) |
| GET | `/api/v1/biometric-devices/:id` | ADMIN | one device + health |
| POST | `/api/v1/biometric-devices` | ADMIN | create (name, host, port, model, serial, active, pollIntervalMs) |
| PATCH | `/api/v1/biometric-devices/:id` | ADMIN | partial update |
| POST | `/api/v1/biometric-devices/:id/sync` | ADMIN | manual pull+ingest, idempotent |
| DELETE | `/api/v1/biometric-devices/:id` | ADMIN | removes device + its sync logs (Attendance rows kept) |
| POST | `/api/v1/dev/device-events` | ADMIN (dev only) | simulate terminal events through the real pipeline |

A sync response reports `{ deviceId, stats: { fetched, newLogs, duplicates, matched, unmatched, applied } }`.
Re-running a sync never re-applies: already-seen `[deviceId, deviceLogId]` rows are skipped (`duplicates`).

## Provenance

Every Attendance row written by the device carries:
- `source = 'DEVICE'` (`MANUAL` = DTR form, `IMPORT` = CSV, `PUNCH` = kiosk/portal punch, `DEVICE` = terminal),
- `deviceRef = 'DEVICE:<deviceId>:<BiometricDeviceLog.id>'` — trace any DTR row back to the exact terminal + log record.

## Deployment

- The poller runs inside the existing backend process; enable via env. Runs on one
  process only — if you scale the backend horizontally, point a single instance at
  the poller or move the loop to a worker.
- Firewall must allow **outbound TCP 4370** from the backend to the terminal.
- Terminal time accuracy matters: a wrong clock shifts the day boundary and yields
  rows on the wrong Manila date.

## Known limits / next steps

- Single `zkteco-js` pull per round per device; large logs are fine but a stale
  device can take `timeoutMs*3` worst-case before the row's `lastError` updates.
- **ADMS push** (newer plus/MB models exposing `http://<ip>/iclock/cdata`, port 80) is
  a planned follow-up for terminals the ZK raw protocol can't reach.
- Provisioning users (`setUser`) to terminals from HRMS is not wired yet — do it on
  the device admin screen today; hardware validation needs a real unit on the LAN.