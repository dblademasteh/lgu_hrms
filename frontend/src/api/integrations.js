import { api } from './client.js';

export const integrationsApi = {
  // Health check - public endpoint
  health: () => api.get('/integrations/health').then(r => r.data),

  // Setup catalog - scopes, webhook events and per-type endpoint contract
  catalog: () => api.get('/integrations/catalog').then(r => r.data),

  // API Keys management
  listKeys: () => api.get('/integrations/keys').then(r => r.data),
  createKey: (data) => api.post('/integrations/keys', data).then(r => r.data),
  revokeKey: (id) => api.delete(`/integrations/keys/${id}`).then(r => r.data),
  deleteKey: (id) => api.delete(`/integrations/keys/${id}`, { params: { hard: 'true' } }).then(r => r.data),
  
  // Webhooks management
  listWebhooks: () => api.get('/integrations/webhooks').then(r => r.data),
  createWebhook: (data) => api.post('/integrations/webhooks', data).then(r => r.data),
  updateWebhook: (id, data) => api.put(`/integrations/webhooks/${id}`, data).then(r => r.data),
  deleteWebhook: (id) => api.delete(`/integrations/webhooks/${id}`).then(r => r.data),
  testWebhook: (id) => api.post(`/integrations/webhooks/${id}/test`).then(r => r.data),
  rotateWebhookSecret: (id) => api.post(`/integrations/webhooks/${id}/rotate-secret`).then(r => r.data),
  
  // External Systems management
  listExternalSystems: () => api.get('/integrations/external-systems').then(r => r.data),
  createExternalSystem: (data) => api.post('/integrations/external-systems', data).then(r => r.data),
  updateExternalSystem: (id, data) => api.put(`/integrations/external-systems/${id}`, data).then(r => r.data),
  deleteExternalSystem: (id) => api.delete(`/integrations/external-systems/${id}`).then(r => r.data),
  
  // Connectivity probes (protected by API key) — used by the setup wizard's
  // verify step, which pastes the raw key once and hits the real endpoints.
  testPayroll: (apiKey) => api.post('/integrations/payroll/test', null, { headers: { 'x-api-key': apiKey } }).then(r => r.data),
  testAttendance: (apiKey) => api.post('/integrations/attendance/test', null, { headers: { 'x-api-key': apiKey } }).then(r => r.data),
  testLeave: (apiKey) => api.post('/integrations/leave/test', null, { headers: { 'x-api-key': apiKey } }).then(r => r.data),

  // Leave data surface (protected by API key, `leave:read`)
  leaveRequests: (params, apiKey) => api.get('/integrations/leave/requests', { params, headers: { 'x-api-key': apiKey } }).then(r => r.data),
  leaveCredits: (params, apiKey) => api.get('/integrations/leave/credits', { params, headers: { 'x-api-key': apiKey } }).then(r => r.data),

  // Read probes used by the setup wizard's verify step: connectivity alone
  // does not prove the key carries the scope the endpoint requires.
  payrollPeriods: (params, apiKey) => api.get('/integrations/payroll/periods', { params, headers: { 'x-api-key': apiKey } }).then(r => r.data),
  attendanceList: (params, apiKey) => api.get('/integrations/attendance', { params, headers: { 'x-api-key': apiKey } }).then(r => r.data),
};
