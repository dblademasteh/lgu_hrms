import { api } from './client.js';

// Performance reviews
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

// Competencies
export async function listCompetencies({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const { data } = await api.get(`/performance/competencies?${params.toString()}`);
  return data;
}

export async function createCompetency(payload) {
  const { data } = await api.post('/performance/competencies', payload);
  return data;
}

export async function updateCompetency(id, payload) {
  const { data } = await api.patch(`/performance/competencies/${id}`, payload);
  return data;
}

export async function deleteCompetency(id) {
  await api.delete(`/performance/competencies/${id}`);
}

// Review competencies (matrix items)
export async function listReviewCompetencies(reviewId) {
  const { data } = await api.get(`/performance/${reviewId}/competencies`);
  return data;
}

export async function addReviewCompetency(reviewId, payload) {
  const { data } = await api.post(`/performance/${reviewId}/competencies`, payload);
  return data;
}

export async function updateReviewCompetency(reviewId, itemId, payload) {
  const { data } = await api.patch(`/performance/${reviewId}/competencies/${itemId}`, payload);
  return data;
}

export async function removeReviewCompetency(reviewId, itemId) {
  await api.delete(`/performance/${reviewId}/competencies/${itemId}`);
}
