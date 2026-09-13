import { api } from './client.js';

export const payrollApi = {
  listRuns: (params) => api.get('/payroll/runs', { params }),
  getRun: (id) => api.get(`/payroll/runs/${id}`),
  listPeriods: () => api.get('/payroll/periods'),
  createPeriod: (data) => api.post('/payroll/periods', data),
  closePeriod: (id) => api.patch(`/payroll/periods/${id}/close`),
  createRun: (data) => api.post('/payroll/runs', data),
  approveRun: (id) => api.patch(`/payroll/runs/${id}/approve`),
  generateRun: (id) => api.post(`/payroll/runs/${id}/generate`),
  postRun: (id) => api.post(`/payroll/runs/${id}/post`),
  payslipPrintUrl: (itemId) => `/api/v1/payroll/payslips/${itemId}/print`,
};