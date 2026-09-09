import { api } from './client.js';

export const accountApi = {
  getProfile: () => api.get('/account/me'),
  updateProfile: (data) => api.patch('/account/me', data),
  changePassword: (data) => api.post('/account/password/change', data),
  getSessions: () => api.get('/account/sessions'),
  revokeSession: (id) => api.post(`/account/sessions/${id}/revoke`)
};
