import * as service from '../services/performanceService.js';

export async function listPerformanceReviewsHandler(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { employeeId, reviewYear, status } = req.query;
    const data = await service.listPerformanceReviews({ page, limit, employeeId, reviewYear, status });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function getPerformanceReviewHandler(req, res, next) {
  try {
    const review = await service.getPerformanceReview(req.params.id);
    res.json(review);
  } catch (e) {
    next(e);
  }
}

export async function createPerformanceReviewHandler(req, res, next) {
  try {
    const review = await service.createPerformanceReview(req.body);
    res.status(201).json(review);
  } catch (e) {
    next(e);
  }
}

export async function updatePerformanceReviewHandler(req, res, next) {
  try {
    const review = await service.updatePerformanceReview(req.params.id, req.body);
    res.json(review);
  } catch (e) {
    next(e);
  }
}

export async function deletePerformanceReviewHandler(req, res, next) {
  try {
    await service.deletePerformanceReview(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
