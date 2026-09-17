import { api } from './client.js';

/**
 * Document Tracking & Management System (DTMS) API.
 * All endpoints are tenant-scoped. Upload via FormData (multipart).
 */
export const documentsApi = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  create: (data, file) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('type', data.type);
    if (data.description) form.append('description', data.description);
    if (data.version) form.append('version', data.version);
    if (data.effectiveDate) form.append('effectiveDate', data.effectiveDate);
    if (data.tags?.length) data.tags.forEach(t => form.append('tags[]', t));
    if (data.relatedEmployeeId) form.append('relatedEmployeeId', data.relatedEmployeeId);
    form.append('status', data.status || 'DRAFT');
    if (file) form.append('file', file);
    return api.post('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data, file) => {
    const form = new FormData();
    if (data.title) form.append('title', data.title);
    if (data.type) form.append('type', data.type);
    if (data.description !== undefined) form.append('description', data.description);
    if (data.version) form.append('version', data.version);
    if (data.effectiveDate !== undefined) form.append('effectiveDate', data.effectiveDate);
    if (data.tags) data.tags.forEach(t => form.append('tags[]', t));
    if (data.relatedEmployeeId !== undefined) form.append('relatedEmployeeId', data.relatedEmployeeId);
    if (data.status) form.append('status', data.status);
    if (file) form.append('file', file);
    return api.patch(`/documents/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (id) => api.delete(`/documents/${id}`),
  setStatus: (id, status) => api.patch(`/documents/${id}/status/${status}`),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  stats: () => api.get('/documents/stats'),
  tracking: (params) => api.get('/documents/tracking', { params }),
  documentTimeline: (id) => api.get(`/documents/${id}/tracking`),
  trackingExport: (params) => api.get('/documents/tracking/export', { params, responseType: 'blob' }),
  workflow: () => api.get('/documents/workflow'),
};
