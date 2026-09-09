import { reportsService } from '../services/reportsService.js';

export const reportsController = {
  async list(req, res) {
    const reports = await reportsService.list();
    res.json(reports);
  }
};