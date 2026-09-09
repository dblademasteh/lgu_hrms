import { api } from './client.js';

export async function login(username, password) {
  const res = await api.post('/auth/login', { username, password });
  return res.data;
}

export async function refreshToken(refreshToken) {
  const res = await api.post('/auth/refresh', { refreshToken });
  return res.data;
}
