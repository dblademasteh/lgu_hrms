import { api } from './client.js';

export const positionsApi = {
  list: () => api.get('/positions'),
};
