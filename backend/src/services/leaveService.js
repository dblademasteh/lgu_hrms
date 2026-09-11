import { leaveRepository } from '../repositories/leaveRepository.js';
import { AppError } from '../lib/errors.js';

function toUtcDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T00:00:00.000Z`)
    : v;
}

export const leaveService = {
  async listRequests(req) {
    return leaveRepository.findAllRequests(req);
  },
  async createRequest(req, data) {
    const { fromDate, toDate, ...rest } = data;
    if (toDate < fromDate) {
      throw new AppError('toDate cannot be before fromDate', 400, 'VALIDATION_ERROR');
    }
    return leaveRepository.createRequest(req, { ...rest, fromDate: toUtcDate(fromDate), toDate: toUtcDate(toDate) });
  },
  async updateRequest(req, id, data) {
    return leaveRepository.updateRequest(req, id, data);
  },
  async listCredits(req, employeeId) {
    return leaveRepository.findCredits(req, employeeId);
  }
};