import { api } from './client.js';
export const plantillaApi = {
  list: ({page=1,limit=50,departmentId,status}={}) => api.get(`/plantilla?page=${page}&limit=${limit}${departmentId?`&departmentId=${departmentId}`:''}${status?`&status=${status}`:''}`),
  get: id => api.get(`/plantilla/${id}`),
  create: data => api.post('/plantilla', data),
  update: (id,data)=> api.patch(`/plantilla/${id}`, data),
  remove: id => api.delete(`/plantilla/${id}`),
};
