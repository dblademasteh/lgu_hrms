import { payrollService } from '../services/payrollService.js';

export const payrollController = {
  async listRuns(req, res, next) {
    try {
      res.json(await payrollService.listRuns(req));
    } catch (e) {
      next(e);
    }
  },
  async listPeriods(req, res, next) {
    try {
      res.json(await payrollService.listPeriods(req));
    } catch (e) {
      next(e);
    }
  },
  async getRun(req, res, next) {
    try {
      const run = await payrollService.getRun(req, req.params.id);
      if (!run) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      }
      res.json(run);
    } catch (e) {
      next(e);
    }
  },
  async createPeriod(req, res, next) {
    try {
      const period = await payrollService.createPeriod(req, req.body);
      res.status(201).json(period);
    } catch (e) {
      next(e);
    }
  },
  async closePeriod(req, res, next) {
    try {
      res.json(await payrollService.closePeriod(req, req.params.id));
    } catch (e) {
      next(e);
    }
  },
  async createRun(req, res, next) {
    try {
      const run = await payrollService.createRun(req, { ...req.body, createdBy: req.user.id });
      res.status(201).json(run);
    } catch (e) {
      next(e);
    }
  },
  async approveRun(req, res, next) {
    try {
      res.json(await payrollService.approveRun(req, req.params.id));
    } catch (e) {
      next(e);
    }
  },
  async generateRun(req, res, next) {
    try {
      res.json(await payrollService.generateRun(req, req.params.id));
    } catch (e) {
      next(e);
    }
  },
  async postRun(req, res, next) {
    try {
      res.json(await payrollService.postRun(req, req.params.id));
    } catch (e) {
      next(e);
    }
  },
  async printPayslip(req, res, next) {
    try {
      res.type('html').send(await payrollService.getPayslipPrint(req, req.params.itemId));
    } catch (e) {
      next(e);
    }
  },
  async bankExport(req, res, next) {
    try {
      const result = await payrollService.bankExport(req, req.params.id);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (e) {
      next(e);
    }
  }
};