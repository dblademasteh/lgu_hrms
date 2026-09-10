import { api } from './client.js';

export const bonusApi = {
  list: (params) => api.get('/bonus', { params }),
  create: (data) => api.post('/bonus', data),
  update: (id, data) => api.patch(`/bonus/${id}`, data),
};
