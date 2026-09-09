import { api } from './client.js';
export async function listApplicants({ page=1, limit=50, search, status }){
  const { data } = await api.get('/recruitment/applicants', { params:{ page, limit, search, status } });
  return data;
}
export async function createApplicant(payload){ const { data } = await api.post('/recruitment/applicants', payload); return data; }
export async function updateApplicant(id, payload){ const { data } = await api.patch(`/recruitment/applicants/${id}`, payload); return data; }
export async function listEligibilities({ page=1, limit=50, employeeId }){
  const { data } = await api.get('/recruitment/eligibilities', { params:{ page, limit, employeeId } });
  return data;
}
export async function createEligibility(payload){ const { data } = await api.post('/recruitment/eligibilities', payload); return data; }
