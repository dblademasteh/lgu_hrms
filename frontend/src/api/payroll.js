import { api } from './client.js';

export const payrollApi = {
  listRuns: (params) => api.get('/payroll/runs', { params }),
  getRun: (id) => api.get(`/payroll/runs/${id}`),
  listPeriods: () => api.get('/payroll/periods'),
  syncFromPayroll: (since) => api.post('/payroll/sync-from-payroll', since ? { since } : {}),
};