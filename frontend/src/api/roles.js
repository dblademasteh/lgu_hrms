import { api } from './client.js';

export const rolesApi = {
  list: () => api.get('/roles'),
  capabilities: () => api.get('/roles/capabilities'),
  permissions: () => api.get('/roles/permissions'),
  myPermissions: () => api.get('/roles/my-permissions'),
  create: (data) => api.post('/roles', data),
  update: (name, data) => api.patch(`/roles/${encodeURIComponent(name)}`, data),
  delete: (name) => api.delete(`/roles/${encodeURIComponent(name)}`),
  updatePermissions: (name, permissions) => api.patch(`/roles/${encodeURIComponent(name)}/permissions`, { permissions }),
};
