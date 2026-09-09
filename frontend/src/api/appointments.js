import { api } from './client.js';

export const appointmentsApi = {
  list: () => api.get('/appointments'),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.patch(`/appointments/${id}`, data),
  remove: (id) => api.delete(`/appointments/${id}`)
};