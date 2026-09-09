import { api } from './client.js';

export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};