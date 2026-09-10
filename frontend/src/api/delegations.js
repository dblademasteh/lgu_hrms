import { api } from './client.js';

export const delegationsApi = {
  list: () => api.get('/delegations'),
  create: (data) => api.post('/delegations', data),
  revoke: (id) => api.post(`/delegations/${id}/revoke`),
};
