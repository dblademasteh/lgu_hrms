import { api } from './client.js';
import { listData } from './shape.js';

export const usersApi = {
  // GET /users returns a bare array; listData normalises it so callers always
  // receive an array regardless of the endpoint's convention.
  list: () => api.get('/users').then(listData),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};
