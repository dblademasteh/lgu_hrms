import { api } from './client.js';

export const attendanceApi = {
  list: (params) => api.get('/attendance', { params })
};