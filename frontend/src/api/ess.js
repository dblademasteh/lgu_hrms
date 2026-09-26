import { api } from './client';

export const getEssProfile = () => api.get('/ess/profile').then(r => r.data.employee);
export const getEssPayslips = () => api.get('/ess/payslips').then(r => r.data.payslips);
export const getEssLeaveRequests = () => api.get('/ess/leave-requests').then(r => r.data.requests);
export const createEssLeaveRequest = (payload) => api.post('/ess/leave-requests', payload).then(r => r.data.request);
export const getEssAttendance = (month) => api.get('/ess/attendance', { params: { month } }).then(r => r.data.records);
