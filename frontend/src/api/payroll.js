import { api } from './client.js';

export const payrollApi = {
  listRuns: () => api.get('/payroll/runs'),
  createRun: (data) => api.post('/payroll/runs', data)
};