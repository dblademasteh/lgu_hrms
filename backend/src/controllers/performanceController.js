import { performanceService } from '../services/performanceService.js';

export const performanceController = {
  // Review handlers
  async list(req, res, next) {
    try {
      const data = await performanceService.listPerformanceReviews(req, {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 50, 200),
        employeeId: req.query.employeeId,
        reviewYear: req.query.reviewYear,
        status: req.query.status,
      });
      res.json(data);
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const review = await performanceService.getPerformanceReview(req, req.params.id);
      res.json(review);
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const review = await performanceService.createPerformanceReview(req, req.body);
      res.status(201).json(review);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const review = await performanceService.updatePerformanceReview(req, req.params.id, req.body);
      res.json(review);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await performanceService.deletePerformanceReview(req, req.params.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  // Competency catalog handlers
  async listCompetencies(req, res, next) {
    try {
      const data = await performanceService.listCompetencies(req, {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 50, 200),
      });
      res.json(data);
    } catch (e) { next(e); }
  },

  async getCompetency(req, res, next) {
    try {
      const competency = await performanceService.getCompetency(req, req.params.id);
      res.json(competency);
    } catch (e) { next(e); }
  },

  async createCompetency(req, res, next) {
    try {
      const competency = await performanceService.createCompetency(req, req.body);
      res.status(201).json(competency);
    } catch (e) { next(e); }
  },

  async updateCompetency(req, res, next) {
    try {
      const competency = await performanceService.updateCompetency(req, req.params.id, req.body);
      res.json(competency);
    } catch (e) { next(e); }
  },

  async deleteCompetency(req, res, next) {
    try {
      await performanceService.deleteCompetency(req, req.params.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  // Review competency handlers
  async listReviewCompetencies(req, res, next) {
    try {
      const data = await performanceService.listReviewCompetencies(req, req.params.id);
      res.json(data);
    } catch (e) { next(e); }
  },

  async addReviewCompetency(req, res, next) {
    try {
      const item = await performanceService.addReviewCompetency(req, req.params.id, req.body);
      res.status(201).json(item);
    } catch (e) { next(e); }
  },

  async updateReviewCompetency(req, res, next) {
    try {
      const item = await performanceService.updateReviewCompetency(req, req.params.id, req.params.itemId, req.body);
      res.json(item);
    } catch (e) { next(e); }
  },

  async removeReviewCompetency(req, res, next) {
    try {
      await performanceService.removeReviewCompetency(req, req.params.id, req.params.itemId);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
