import { api } from './client.js';
export const designationApi = {
  list: ({page=1,limit=50,employeeId}={}) => api.get(`/designation?page=${page}&limit=${limit}${employeeId?`&employeeId=${employeeId}`:''}`),
  get: id => api.get(`/designation/${id}`),
  create: data => api.post('/designation', data),
  update: (id,data)=> api.patch(`/designation/${id}`, data),
  remove: id => api.delete(`/designation/${id}`),
};
