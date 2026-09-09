import { auditService } from '../services/auditService.js';

export const auditController = {
  async list(req, res) {
    const { entity, page = 1, limit = 50 } = req.query;
    const logs = await auditService.list({ entity, page: Number(page), limit: Number(limit) });
    res.json(logs);
  }
};