import { interviewService } from '../services/interviewService.js';

export const interviewController = {
  async list(req, res, next) {
    try {
      const { applicantId } = req.query || {};
      res.json(await interviewService.list(req, { applicantId, page: Number(req.query.page) || 1, limit: Math.min(Number(req.query.limit) || 50, 200) }));
    } catch (e) {
      next(e);
    }
  },

  async get(req, res, next) {
    try {
      const item = await interviewService.get(req, req.params.id);
      if (!item) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  async create(req, res, next) {
    try {
      const item = await interviewService.create(req, req.body);
      res.status(201).json(item);
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const item = await interviewService.update(req, req.params.id, req.body);
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  async remove(req, res, next) {
    try {
      await interviewService.delete(req, req.params.id);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
};
