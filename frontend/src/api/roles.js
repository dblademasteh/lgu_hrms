import { api } from './client.js';

export const rolesApi = {
  list: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (name, data) => api.patch(`/roles/${encodeURIComponent(name)}`, data),
  delete: (name) => api.delete(`/roles/${encodeURIComponent(name)}`),
};
