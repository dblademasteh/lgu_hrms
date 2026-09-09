import { delegationService } from '../services/delegationService.js';

export const delegationController = {
  async list(req, res) {
    const data = await delegationService.listForUser(req.user.id);
    res.json(data);
  },
  async create(req, res) {
    const data = await delegationService.create(req.user.id, req.body);
    res.json(data);
  },
  async revoke(req, res) {
    await delegationService.revoke(req.params.id, req.user.id);
    res.json({ message: 'Delegation revoked' });
  }
};
