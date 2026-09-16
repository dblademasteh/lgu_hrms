import { vacancyPublicationService } from '../services/vacancyPublicationService.js';

export const vacancyPublicationController = {
  async list(req, res, next) {
    try {
      const items = await vacancyPublicationService.list(req, {
        vacancyId: req.query.vacancyId,
        channel: req.query.channel,
      });
      res.json({ publications: items });
    } catch (e) {
      next(e);
    }
  },

  async create(req, res, next) {
    try {
      const item = await vacancyPublicationService.create(req, req.body);
      res.status(201).json(item);
    } catch (e) {
      next(e);
    }
  },

  async remove(req, res, next) {
    try {
      await vacancyPublicationService.delete(req, req.params.id);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
};
