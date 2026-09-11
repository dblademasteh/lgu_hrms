import { payrollRepository } from '../repositories/payrollRepository.js';
import { AppError } from '../lib/errors.js';

export const payrollService = {
  async listRuns(req) {
    return payrollRepository.findAllRuns(req);
  },
  async listPeriods(req) {
    return payrollRepository.findAllPeriods(req);
  },
  async getRun(req, id) {
    return payrollRepository.findRunById(req, id);
  },
  async createRun(req, data) {
    return payrollRepository.createRun(req, data);
  },
  /** DRAFT -> APPROVED. POSTED runs are immutable; APPROVED runs can't re-approve. */
  async approveRun(req, id) {
    const run = await payrollRepository.findRunById(req, id);
    if (!run) throw new AppError('Payroll run not found', 404, 'NOT_FOUND');
    if (run.status !== 'DRAFT') {
      throw new AppError(`Only DRAFT runs can be approved (current: ${run.status})`, 409, 'CONFLICT');
    }
    return payrollRepository.updateRunStatus(req, id, 'APPROVED');
  }
};