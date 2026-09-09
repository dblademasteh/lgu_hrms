import { api } from './client.js';

export async function listEmployees({ page = 1, limit = 50, search, departmentId, status }) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  if (departmentId) params.append('departmentId', departmentId);
  if (status) params.append('status', status);
  const { data } = await api.get(`/employees?${params.toString()}`);
  return data;
}

export async function getEmployee(id) {
  const { data } = await api.get(`/employees/${id}`);
  return data;
}
