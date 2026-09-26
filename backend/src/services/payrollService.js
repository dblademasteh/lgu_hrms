import { payrollRepository } from '../repositories/payrollRepository.js';

/**
 * Read-only mirror of lgu-payroll.
 *
 * HRMS receives payroll data; it does not compute it. All payroll writes
 * (periods, runs, generation, approval, posting) and all payroll artifacts
 * (LDDAP bank export, payslip documents) live in lgu-payroll, the system of
 * record. Mirroring happens through services/payrollAdapter.js.
 */
export const payrollService = {
  async listRuns(req) {
    const q = req.query ?? {};
    return payrollRepository.findRuns(req, {
      page: q.page,
      limit: q.limit,
      summary: q.summary,
    });
  },
  async listPeriods(req) {
    return payrollRepository.findAllPeriods(req);
  },
  async getRun(req, id) {
    return payrollRepository.findRunById(req, id);
  },
};
