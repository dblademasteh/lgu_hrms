/**
 * Thin adapter around `zkteco-js` (raw ZK protocol over TCP, port 4370).
 * Normalizes device log records into { deviceLogId, userId, punchedAt,
 * verification } and bounds every step with a timeout so a hung device can
 * never stall the poller.
 */
function withTimeout(promiseFactory, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promiseFactory().then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function pullZkAttendance({ host, port = 4370, timeoutMs = 12000 } = {}) {
  const { default: Zkteco } = await import('zkteco-js');
  const device = new Zkteco(host, port, timeoutMs, 5000);

  await withTimeout(() => device.createSocket(), timeoutMs, `connect ${host}:${port}`);
  try {
    // Re-enable the terminal if a prior session left it disabled.
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