import { delegationService } from '../services/delegationService.js';

export const delegationController = {
  async list(req, res, next) {
    try {
      const data = await delegationService.listForUser(req.user.id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  },
  async create(req, res, next) {
    try {
      const data = await delegationService.create(req.user.id, req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  },
  async revoke(req, res, next) {
    try {
      await delegationService.revoke(req.params.id, req.user.id);
      res.json({ message: 'Delegation revoked' });
    } catch (e) {
      next(e);
    }
  },
};
