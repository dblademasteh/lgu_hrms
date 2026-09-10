import { attendanceRepository } from '../repositories/attendanceRepository.js';

function toUtcDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T00:00:00.000Z`)
    : v;
}

export const attendanceService = {
  async list(date) {
    return attendanceRepository.findAll(date);
  },
  async create(data) {
    const { date, timeIn, timeOut, ...rest } = data;
    return attendanceRepository.create({
      ...rest,
      date: toUtcDate(date),
      timeIn: timeIn ? new Date(timeIn) : null,
      timeOut: timeOut ? new Date(timeOut) : null,
    });
  }
};