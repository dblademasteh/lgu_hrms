import { payrollService } from '../services/payrollService.js';

export const payrollController = {
  async listRuns(req, res) {
    const runs = await payrollService.listRuns();
    res.json(runs);
  },
  async createRun(req, res) {
    const run = await payrollService.createRun(req.body);
    res.status(201).json(run);
  }
};