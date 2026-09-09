import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      if (auth.refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken: auth.refreshToken,
          });
          const newToken = res.data.accessToken;
          localStorage.setItem('auth', JSON.stringify({ ...auth, accessToken: newToken }));
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('auth');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);
