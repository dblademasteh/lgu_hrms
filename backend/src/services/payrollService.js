import { payrollRepository } from '../repositories/payrollRepository.js';

export const payrollService = {
  async listRuns() {
    return payrollRepository.findAllRuns();
  },
  async createRun(data) {
    return payrollRepository.createRun(data);
  }
};