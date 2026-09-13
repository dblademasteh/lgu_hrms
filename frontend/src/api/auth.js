import { api } from './client.js';

export async function login(username, password, tenantId) {
  const headers = tenantId ? { 'X-Tenant-Id': tenantId } : {};
  const res = await api.post('/auth/login', { username, password }, { headers });
  return res.data;
}

export async function loginPin(username, pin, tenantId) {
  const headers = tenantId ? { 'X-Tenant-Id': tenantId } : {};
  const res = await api.post('/auth/login-pin', { username, pin }, { headers });
  return res.data;
}

export async function setupPin(pin) {
  const res = await api.post('/auth/pin/setup', { pin });
  return res.data;
}

export async function removePin() {
  const res = await api.delete('/auth/pin');
  return res.data;
}

export async function refreshToken(refreshToken) {
  const res = await api.post('/auth/refresh', { refreshToken });
  return res.data;
}

// SSO (OIDC): status is public; login/callback follow the standard session shape.
export async function oidcStatus() {
  const res = await api.get('/auth/oidc/status');
  return res.data;
}

export async function oidcLoginUrl(tenantId) {
  const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  const res = await api.get(`/auth/oidc/login${params}`);
  return res.data;
}

export async function oidcConsume(ticket) {
  const res = await api.post('/auth/oidc/consume', { ticket });
  return res.data;
}
