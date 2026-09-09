import { attendanceRepository } from '../repositories/attendanceRepository.js';

export const attendanceService = {
  async list(date) {
    return attendanceRepository.findAll(date);
  },
  async create(data) {
    return attendanceRepository.create(data);
  }
};