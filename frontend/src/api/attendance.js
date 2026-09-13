import { api } from './client.js';

export const attendanceApi = {
  list: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.patch(`/attendance/${id}`, data),
  remove: (id) => api.delete(`/attendance/${id}`),
  bulkImport: (records) => api.post('/attendance/import', { records }),
};
