import { api } from './client.js';

const BASE = '/employees';

export const employeeSectionsApi = {
  list: (employeeId, section) => api.get(`${BASE}/${employeeId}/sections/${section}`),
  create: (employeeId, section, data) => api.post(`${BASE}/${employeeId}/sections/${section}`, data),
  update: (employeeId, section, recordId, data) =>
    api.patch(`${BASE}/${employeeId}/sections/${section}/${recordId}`, data),
  remove: (employeeId, section, recordId) =>
    api.delete(`${BASE}/${employeeId}/sections/${section}/${recordId}`),
};

export const SECTION_NAMES = ['eligibilities', 'family', 'education', 'awards', 'history'];
