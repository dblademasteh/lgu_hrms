import { api } from './client.js';

export const biometricApi = {
  punch: (type) => api.post('/attendance/punch', { punchType: type }),
  publicPunch: (employeeNumber, punchType, tenantCode, punchKey, deviceId) =>
    api.post('/attendance/public-punch/punch', { employeeNumber, punchType, tenantCode, punchKey, deviceId }),
  enroll: (credentialId, publicKey, deviceName) => api.post('/biometric/enroll', { credentialId, publicKey, deviceName }),
  verify: (credentialId, assertion, punchType) => api.post('/biometric/verify', { credentialId, assertion, punchType }),
  getCredentials: () => api.get('/biometric/credentials').then(r => r.data),
  getEmployeeCredentials: (employeeId) => api.get('/biometric/credentials', { params: { employeeId } }).then(r => r.data),
  removeCredential: (credentialId) => api.delete(`/biometric/credentials/${credentialId}`),
  getMyAttendance: (month) => api.get('/attendance/my', { params: { month } }),
  getTodayAttendance: () => api.get('/attendance/today')
};