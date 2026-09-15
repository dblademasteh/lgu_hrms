const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

export const kioskApi = {
  /** Public punch — no JWT. punchKey is required server-side when
   *  BIOMETRIC_PUNCH_KEY is configured; otherwise it is ignored. */
  punch: (employeeNumber, punchType, tenantCode, punchKey, deviceId) =>
    fetch(`${BASE}/attendance/public-punch/punch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeNumber, punchType, tenantCode, punchKey, deviceId }),
    }).then(async (res) => {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json?.error?.message || 'Punch failed');
        err.code = json?.error?.code;
        err.response = { data: json, status: res.status };
        throw err;
      }
      return { data: json };
    }),
};