import { api } from './client.js';

export const integrationsApi = {
  // Health check - public endpoint
  health: () => api.get('/integrations/health').then(r => r.data),
  
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
  
  // Employees endpoint (protected by API key)
  getEmployees: () => api.get('/integrations/employees').then(r => r.data),
};
