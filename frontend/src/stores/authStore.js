import { create } from 'zustand';
import { login as apiLogin, loginPin as apiLoginPin } from '../api/auth.js';

const persist = (data) => {
  localStorage.setItem('auth', JSON.stringify({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    passwordAgeDays: data.passwordAgeDays,
    passwordExpired: data.passwordExpired,
  }));
  return {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    passwordAgeDays: data.passwordAgeDays,
    passwordExpired: data.passwordExpired,
  };
};

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  passwordAgeDays: null,
  passwordExpired: false,
  loading: false,
  error: null,

  login: async (username, password, tenantId) => {
    set({ loading: true, error: null });
    try {
      const data = await apiLogin(username, password, tenantId);
      set({ ...persist(data), loading: false });
      return true;
    } catch (e) {
      set({ error: e.response?.data?.error?.message || 'Login failed', loading: false });
      return false;
    }
  },

  loginPin: async (username, pin, tenantId) => {
    set({ loading: true, error: null });
    try {
      const data = await apiLoginPin(username, pin, tenantId);
      set({ ...persist(data), loading: false });
      return true;
    } catch (e) {
      set({ error: e.response?.data?.error?.message || 'Login failed', errorStatus: e.response?.status, loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('auth');
    set({ user: null, accessToken: null, refreshToken: null, passwordAgeDays: null, passwordExpired: false });
  },

  hydrate: () => {
    const raw = localStorage.getItem('auth');
    if (raw) {
      const auth = JSON.parse(raw);
      set({ user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken, passwordAgeDays: auth.passwordAgeDays, passwordExpired: auth.passwordExpired });
    }
  },
}));
