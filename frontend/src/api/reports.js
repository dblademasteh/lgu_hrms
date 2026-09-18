import { api } from './client.js';

export const reportsApi = {
  payrollSummary: (params) => api.get('/reports/payroll-summary', { params }),
  payrollRegister: (params) => api.get('/reports/payroll-register', { params }, { responseType: params?.format === 'csv' ? 'blob' : 'json' }),
  payrollJournal: (params) => api.get('/reports/payroll-journal', { params }, { responseType: params?.format === 'csv' ? 'blob' : 'json' }),
  employeeMasterList: (params) => api.get('/reports/employee-master-list', { params }, { responseType: params?.format === 'csv' ? 'blob' : 'json' }),
  serviceRecord: (employeeId) => api.get(`/reports/service-record/${employeeId}`),
};
