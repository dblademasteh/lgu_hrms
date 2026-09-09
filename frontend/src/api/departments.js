import { api } from './client.js';

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  remove: (id) => api.delete(`/departments/${id}`)
};