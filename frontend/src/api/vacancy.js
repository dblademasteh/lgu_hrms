import { api } from './client.js';
export const vacancyApi = {
  list: ({page=1,limit=50,status,departmentId}={}) => api.get(`/vacancy?page=${page}&limit=${limit}${status?`&status=${status}`:''}${departmentId?`&departmentId=${departmentId}`:''}`),
  get: id => api.get(`/vacancy/${id}`),
  create: data => api.post('/vacancy', data),
  update: (id,data)=> api.patch(`/vacancy/${id}`, data),
  remove: id => api.delete(`/vacancy/${id}`),
};
