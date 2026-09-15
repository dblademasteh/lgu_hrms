import { pullZkAttendance } from '../lib/zkteco.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { captureError } from '../lib/sentry.js';
import { attendanceService } from './attendanceService.js';

// Dead-simple req stand-in so services requiring `req.tenantId` work off the
// poller loop and manual `POST /:id/sync`.
function virtualReq(tenantId) {
  return { tenantId, user: {} };
}

/**
 * Ingest normalized device logs into BiometricDeviceLog (deduped by
 * [deviceId, deviceLogId]) and apply each matched event through the same
 * punch state machine as the kiosk.
 *
 * Idempotent: logs already applied are skipped on re-ingest. Logs that FAILED
 * to apply are left `applied:false` so the next sync retries them — a transient
 * punch error (e.g. a state conflict) never permanently drops an event. The
 * failure is captured but the rest of the batch still processes.
 */
export async function ingestLogs(req, deviceId, logs) {
  const existingRows = await prisma.biometricDeviceLog.findMany({
    where: { deviceId },
    select: { id: true, deviceLogId: true, applied: true, employeeId: true },
  });
  const existingByKey = new Map(existingRows.map((l) => [l.deviceLogId, l]));
  const appliedKeys = new Set(existingRows.filter((l) => l.applied).map((l) => l.deviceLogId));

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

  const stats = {
    fetched: logs.length,
    newLogs: 0,
    duplicates: 0,
    matched: 0,
    unmatched: 0,
    applied: 0,
    failed: 0,
  };

  for (const log of logs) {
    const key = log.deviceLogId || `${log.punchedAt.getTime()}-${log.userId}`;
    const existing = existingByKey.get(key);

    if (appliedKeys.has(key) || existing?.applied) {
      stats.duplicates += 1;
      continue;
    }
    if (existing && !existing.employeeId) {
      // Previously recorded as unmatched (device userId maps to no employee).
      // A config gap, not a transient error — count once, don't recreate rows.
      stats.unmatched += 1;
      continue;
    }

    const employee = await getEmployee(log.userId);
    let row = existing;
    if (!row) {
      row = await prisma.biometricDeviceLog.create({
        data: {
          tenantId: req.tenantId,
          deviceId,
          deviceLogId: key,
          userId: log.userId,
          punchedAt: log.punchedAt,
          verification: log.verification ?? null,
          employeeId: employee?.id ?? null,
        },
      });
      existingByKey.set(key, row);
      stats.newLogs += 1;
    }

    if (!employee) {
      stats.unmatched += 1;
      continue;
    }
    stats.matched += 1;

    try {
      await attendanceService.devicePunch(req, employee.id, log.punchedAt, `DEVICE:${deviceId}:${key}`);
      await prisma.biometricDeviceLog.update({
        where: { id: row.id },
        data: { applied: true, employeeId: employee.id },
      });
      row.applied = true;
      stats.applied += 1;
    } catch (e) {
      // Transient failure — leave the row on retry state; keep processing.
      stats.failed += 1;
      captureError(e, req);
    }
  }

  return { deviceId, employeeMatched: employees.size, stats };
}

// Pulls live logs from a physical terminal and ingests them. Records
// connectivity health on the device row (lastConnectedAt / lastError).
export async function syncDevice(req, device) {
  let logs = [];
  try {
    logs = await pullZkAttendance({ host: device.host, port: device.port, timeoutMs: 12000 });
    await prisma.biometricDevice.update({
      where: { id: device.id },
      data: { lastConnectedAt: new Date(), lastError: null },
    });
  } catch (e) {
    const message = String(e?.message || e).slice(0, 500);
    await prisma.biometricDevice.update({
      where: { id: device.id },
      data: { lastError: message },
    });
    const err = new Error(`Device sync failed: ${message}`);
    err.status = 502;
    err.code = 'DEVICE_SYNC_FAILED';
    throw err;
  }

  const result = await ingestLogs(req, device.id, logs);
  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { lastSyncAt: new Date() },
  });
  return result;
}

export async function syncDeviceById(deviceId) {
  const device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
  if (!device) {
    const err = new Error('Device not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!device.active) return { deviceId, skipped: true, reason: 'inactive', stats: null };
  return syncDevice(virtualReq(device.tenantId), device);
}

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
  console.log(`[biometric] poller started every ${interval}ms`);
  return pollTimer;
}

export function stopBiometricPoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}