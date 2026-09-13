import { api } from './client.js';

export const biometricApi = {
  punch: (type) => api.post('/attendance/punch', { punchType: type }),
  publicPunch: (employeeNumber, punchType, tenantCode) => api.post('/attendance/public-punch/punch', { employeeNumber, punchType, tenantCode }),
  enroll: (credentialId, publicKey, deviceName) => api.post('/biometric/enroll', { credentialId, publicKey, deviceName }),
  verify: (credentialId, assertion, punchType) => api.post('/biometric/verify', { credentialId, assertion, punchType }),
  getCredentials: () => api.get('/biometric/credentials'),
  removeCredential: (credentialId) => api.delete(`/biometric/credentials/${credentialId}`),
  getMyAttendance: (month) => api.get('/attendance/my', { params: { month } }),
  getTodayAttendance: () => api.get('/attendance/today')
};