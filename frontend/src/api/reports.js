import { api } from './client.js';

export const reportsApi = {
  payrollSummary: (params) => api.get('/reports/payroll-summary', { params }),
};
