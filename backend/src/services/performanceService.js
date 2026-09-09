import * as repo from '../repositories/performanceRepository.js';

export async function listPerformanceReviews(params) {
  return repo.findPerformanceReviews(params);
}

export async function getPerformanceReview(id) {
  const review = await repo.findPerformanceReviewById(id);
  if (!review) {
    const err = new Error('Performance review not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return review;
}

export async function createPerformanceReview(data) {
  return repo.createPerformanceReview(data);
}

export async function updatePerformanceReview(id, data) {
  return repo.updatePerformanceReview(id, data);
}

export async function deletePerformanceReview(id) {
  return repo.deletePerformanceReview(id);
}
