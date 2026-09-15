import { api } from './client.js';

export const biometricDevicesApi = {
  list: () => api.get('/biometric-devices'),
  get: (id) => api.get(`/biometric-devices/${id}`),
  create: (data) => api.post('/biometric-devices', data),
  update: (id, data) => api.patch(`/biometric-devices/${id}`, data),
  sync: (id) => api.post(`/biometric-devices/${id}/sync`),
  remove: (id) => api.delete(`/biometric-devices/${id}`),
};

export const devToolApi = {
  injectDeviceEvents: (employeeNumber, events) =>
    api.post('/dev/device-events', { employeeNumber, events }),
};