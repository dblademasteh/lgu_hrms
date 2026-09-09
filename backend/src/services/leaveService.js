import { leaveRepository } from '../repositories/leaveRepository.js';

export const leaveService = {
  async listRequests() {
    return leaveRepository.findAllRequests();
  },
  async createRequest(data) {
    return leaveRepository.createRequest(data);
  },
  async updateRequest(id, data) {
    return leaveRepository.updateRequest(id, data);
  },
  async listCredits(employeeId) {
    return leaveRepository.findCredits(employeeId);
  }
};