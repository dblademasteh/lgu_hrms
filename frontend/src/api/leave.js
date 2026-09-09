import { api } from './client.js';

export const leaveApi = {
  listRequests: () => api.get('/leave/requests'),
  createRequest: (data) => api.post('/leave/requests', data),
  updateRequest: (id, data) => api.patch(`/leave/requests/${id}`, data),
  listCredits: (employeeId) => api.get('/leave/credits', { params: { employeeId } })
};