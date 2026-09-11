import { payrollService } from '../services/payrollService.js';

export const payrollController = {
  async listRuns(req, res, next) {
    try {
      const runs = await payrollService.listRuns(req);
      res.json(runs);
    } catch (e) {
      next(e);
    }
  },
  async listPeriods(req, res, next) {
    try {
      const periods = await payrollService.listPeriods(req);
      res.json(periods);
    } catch (e) {
      next(e);
    }
  },
  async getRun(req, res, next) {
    try {
      const run = await payrollService.getRun(req, req.params.id);
      if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      res.json(run);
    } catch (e) {
      next(e);
    }
  },
  async createRun(req, res, next) {
    try {
      const run = await payrollService.createRun(req, {
        ...req.body,
        runDate: new Date(`${req.body.runDate}T00:00:00.000Z`),
        createdBy: req.user.id,
        status: 'DRAFT',
      });
      res.status(201).json(run);
    } catch (e) {
      next(e);
    }
  },
  async approveRun(req, res, next) {
    try {
      const run = await payrollService.approveRun(req, req.params.id);
      res.json(run);
    } catch (e) {
      next(e);
    }
  }
};