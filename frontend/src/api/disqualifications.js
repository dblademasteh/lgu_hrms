import { api } from './client.js';

export const disqualificationApi = {
  list: (params) => api.get('/disqualifications', { params }),
  get: (id) => api.get(`/disqualifications/${id}`),
  create: (data) => api.post('/disqualifications', data),
  update: (id, data) => api.patch(`/disqualifications/${id}`, data),
  delete: (id) => api.delete(`/disqualifications/${id}`),
  getReport: (params) => api.get('/disqualifications/report', { params }),
  getActive: () => api.get('/disqualifications/active')
};