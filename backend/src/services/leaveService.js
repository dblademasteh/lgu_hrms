import { leaveRepository } from '../repositories/leaveRepository.js';
import { AppError } from '../lib/errors.js';

function toUtcDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T00:00:00.000Z`)
    : v;
}

export const leaveService = {
  async listRequests() {
    return leaveRepository.findAllRequests();
  },
  async createRequest(data) {
    const { fromDate, toDate, ...rest } = data;
    if (toDate < fromDate) {
      throw new AppError('toDate cannot be before fromDate', 400, 'VALIDATION_ERROR');
    }
    return leaveRepository.createRequest({ ...rest, fromDate: toUtcDate(fromDate), toDate: toUtcDate(toDate) });
  },
  async updateRequest(id, data) {
    return leaveRepository.updateRequest(id, data);
  },
  async listCredits(employeeId) {
    return leaveRepository.findCredits(employeeId);
  }
};