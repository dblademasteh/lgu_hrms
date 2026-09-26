import { api } from './client.js';
import { listData } from './shape.js';

export const departmentsApi = {
  // GET /departments returns a bare array; listData normalises it so callers
  // always receive an array regardless of the endpoint's convention.
  list: () => api.get('/departments').then(listData),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  remove: (id) => api.delete(`/departments/${id}`)
};
