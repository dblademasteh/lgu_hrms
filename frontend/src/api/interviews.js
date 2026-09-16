import { api } from './client.js';

export const interviewsApi = {
  list: (params = {}) => api.get('/interviews', { params }).then(r => r.data),
  get: (id) => api.get(`/interviews/${id}`).then(r => r.data),
  create: (data) => api.post('/interviews', data).then(r => r.data),
  update: (id, data) => api.patch(`/interviews/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/interviews/${id}`).then(r => r.data),
};
