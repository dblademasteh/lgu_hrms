import { api } from './client.js';

export async function listEmployees({ page = 1, limit = 50, search, departmentId, status, keyPosition }) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  if (departmentId) params.append('departmentId', departmentId);
  if (status) params.append('status', status);
  if (keyPosition) params.append('keyPosition', keyPosition);
  const { data } = await api.get(`/employees?${params.toString()}`);
  return data;
}

export async function createEmployee(payload) {
  const { data } = await api.post('/employees', payload);
  return data;
}

export async function updateEmployee(id, payload) {
  const { data } = await api.patch(`/employees/${id}`, payload);
  return data;
}

export async function deleteEmployee(id) {
  await api.delete(`/employees/${id}`);
}