import { api } from './client.js';
export async function listPrograms({ page=1, limit=50, search }){
  const { data } = await api.get('/training/programs', { params:{ page, limit, search } });
  return data;
}
export async function getProgram(id){ const { data } = await api.get(`/training/programs/${id}`); return data; }
export async function createProgram(payload){ const { data } = await api.post('/training/programs', payload); return data; }
export async function updateProgram(id, payload){ const { data } = await api.patch(`/training/programs/${id}`, payload); return data; }
export async function deleteProgram(id){ await api.delete(`/training/programs/${id}`); }
export async function listEnrollments({ page=1, limit=50, employeeId, programId, status }){
  const { data } = await api.get('/training/enrollments', { params:{ page, limit, employeeId, programId, status } });
  return data;
}
export async function createEnrollment(payload){ const { data } = await api.post('/training/enrollments', payload); return data; }
