import { api } from './client.js';

export const accountApi = {
  getProfile: () => api.get('/account/me'),
  updateProfile: (data) => api.patch('/account/me', data),
  changePassword: (data) => api.post('/account/password/change', data),
  exportData: () => api.post('/account/export'),
  getSessions: () => api.get('/account/sessions'),
  revokeSession: (id) => api.post(`/account/sessions/${id}/revoke`),
  getLoginEvents: () => api.get('/account/login-events'),
  getDelegations: () => api.get('/account/delegations'),
  createDelegation: (data) => api.post('/account/delegations', data),
  deleteDelegation: (id) => api.delete(`/account/delegations/${id}`),
  deactivateAccount: () => api.post('/account/deactivate'),
  setup2FA: () => api.post('/account/2fa/setup'),
  verify2FA: (code) => api.post('/account/2fa/verify', { code })
};
