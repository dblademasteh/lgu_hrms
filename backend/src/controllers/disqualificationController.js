import { disqualificationService } from '../services/disqualificationService.js';

export const disqualificationController = {
  async list(req, res, next) {
    try {
      const options = {
        status: req.query.status,
        type: req.query.type,
        reason: req.query.reason,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        search: req.query.search,
      };
      const result = await disqualificationService.getAll(req, options);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async getDibarReport(req, res, next) {
    try {
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        type: req.query.type,
        reason: req.query.reason,
        isBarred: req.query.isBarred ? req.query.isBarred === 'true' : undefined,
      };
      const records = await disqualificationService.getDibarReport(req, options);
      res.json({ records });
    } catch (e) {
      next(e);
    }
  },

  async getById(req, res, next) {
    try {
      const record = await disqualificationService.getById(req, req.params.id);
      if (!record) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Disqualification not found' } });
      }
      res.json(record);
    } catch (e) {
      next(e);
    }
  },

  async create(req, res, next) {
    try {
      const record = await disqualificationService.create(req, req.body, req.user.id);
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const record = await disqualificationService.update(req, req.params.id, req.body);
      res.json(record);
    } catch (e) {
      next(e);
    }
  },

  async delete(req, res, next) {
    try {
      await disqualificationService.delete(req, req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },

  async getActive(req, res, next) {
    try {
      const records = await disqualificationService.getActiveDisqualifications(req);
      res.json({ records });
    } catch (e) {
      next(e);
    }
  },
};
