import { api } from './client.js';

export const loansApi = {
  list: (params) => api.get('/loans', { params }),
  get: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  remove: (id) => api.delete(`/loans/${id}`),
};
