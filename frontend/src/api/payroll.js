import { api } from './client.js';

export const payrollApi = {
  listRuns: () => api.get('/payroll/runs'),
  getRun: (id) => api.get(`/payroll/runs/${id}`),
  listPeriods: () => api.get('/payroll/periods'),
  createRun: (data) => api.post('/payroll/runs', data),
  approveRun: (id) => api.patch(`/payroll/runs/${id}/approve`),
};