import { api } from './client.js';

export const biometricApi = {
  punch: (type) => api.post('/attendance/punch', { punchType: type }),
  getMyAttendance: (month) => api.get('/attendance/my', { params: { month } }),
  getTodayAttendance: () => api.get('/attendance/today')
};