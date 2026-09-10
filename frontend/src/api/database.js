import { api } from './client.js';

export const databaseApi = {
  listTables: () => api.get('/database').then(r => r.data),
  summary: () => api.get('/database/summary').then(r => r.data),
  tableSchema: (name) => api.get(`/database/${name}/schema`).then(r => r.data),
  browse: (name, params) => api.get(`/database/${name}/browse`, { params }).then(r => r.data),
  getOne: (name, id) => api.get(`/database/${name}/${id}`).then(r => r.data),
  remove: (name, id) => api.delete(`/database/${name}/${id}`),
};
