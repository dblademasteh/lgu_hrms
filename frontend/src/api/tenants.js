import { api } from './client.js';

export const tenantsApi = {
  list: () => api.get('/tenants').then(r => r.data),
  create: (data) => api.post('/tenants', data).then(r => r.data),
  update: (id, data) => api.put(`/tenants/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/tenants/${id}`).then(r => r.data),
};
