import { api } from './client.js';

export async function listPerformanceReviews({ page = 1, limit = 50, employeeId, reviewYear, status }) {
  const params = new URLSearchParams({ page, limit });
  if (employeeId) params.append('employeeId', employeeId);
  if (reviewYear) params.append('reviewYear', reviewYear);
  if (status) params.append('status', status);
  const { data } = await api.get(`/performance?${params.toString()}`);
  return data;
}

export async function getPerformanceReview(id) {
  const { data } = await api.get(`/performance/${id}`);
  return data;
}

export async function createPerformanceReview(payload) {
  const { data } = await api.post('/performance', payload);
  return data;
}

export async function updatePerformanceReview(id, payload) {
  const { data } = await api.patch(`/performance/${id}`, payload);
  return data;
}

export async function deletePerformanceReview(id) {
  await api.delete(`/performance/${id}`);
}
