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
