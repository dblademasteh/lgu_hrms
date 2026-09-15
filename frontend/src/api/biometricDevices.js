import { api } from './client.js';

export const biometricDevicesApi = {
  list: () => api.get('/biometric-devices').then(r => r.data),
  get: (id) => api.get(`/biometric-devices/${id}`).then(r => r.data),
  create: (data) => api.post('/biometric-devices', data).then(r => r.data),
  update: (id, data) => api.patch(`/biometric-devices/${id}`, data).then(r => r.data),
  sync: (id) => api.post(`/biometric-devices/${id}/sync`).then(r => r.data),
  remove: (id) => api.delete(`/biometric-devices/${id}`).then(r => r.data),
};

export const devToolApi = {
  injectDeviceEvents: (employeeNumber, events) =>
    api.post('/dev/device-events', { employeeNumber, events }).then(r => r.data),
};