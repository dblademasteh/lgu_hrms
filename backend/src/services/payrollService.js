import { payrollRepository } from '../repositories/payrollRepository.js';
import { AppError } from '../lib/errors.js';

export const payrollService = {
  async listRuns() {
    return payrollRepository.findAllRuns();
  },
  async listPeriods() {
    return payrollRepository.findAllPeriods();
  },
  async getRun(id) {
    return payrollRepository.findRunById(id);
  },
  async createRun(data) {
    return payrollRepository.createRun(data);
  },
  /** DRAFT -> APPROVED. POSTED runs are immutable; APPROVED runs can't re-approve. */
  async approveRun(id) {
    const run = await payrollRepository.findRunById(id);
    if (!run) throw new AppError('Payroll run not found', 404, 'NOT_FOUND');
    if (run.status !== 'DRAFT') {
      throw new AppError(`Only DRAFT runs can be approved (current: ${run.status})`, 409, 'CONFLICT');
    }
    return payrollRepository.updateRunStatus(id, 'APPROVED');
  }
};