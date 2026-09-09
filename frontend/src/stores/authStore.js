import { create } from 'zustand';
import { login as apiLogin } from '../api/auth.js';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem('auth', JSON.stringify({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      }));
      set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, loading: false });
      return true;
    } catch (e) {
      set({ error: e.response?.data?.error?.message || 'Login failed', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('auth');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  hydrate: () => {
    const raw = localStorage.getItem('auth');
    if (raw) {
      const auth = JSON.parse(raw);
      set({ user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken });
    }
  },
}));
