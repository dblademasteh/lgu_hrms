import * as repo from '../repositories/performanceRepository.js';

export async function listPerformanceReviews(req, params) {
  return repo.findPerformanceReviews(req, params);
}

export async function getPerformanceReview(req, id) {
  const review = await repo.findPerformanceReviewById(req, id);
  if (!review) {
    const err = new Error('Performance review not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return review;
}

export async function createPerformanceReview(req, data) {
  return repo.createPerformanceReview(req, data);
}

export async function updatePerformanceReview(req, id, data) {
  return repo.updatePerformanceReview(req, id, data);
}

export async function deletePerformanceReview(req, id) {
  return repo.deletePerformanceReview(req, id);
}
