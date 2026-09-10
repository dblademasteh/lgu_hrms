import { attendanceRepository } from '../repositories/attendanceRepository.js';
import { prisma } from '../lib/prisma.js';

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
  },

  // Biometric punch in/out for employee self-service
  async biometricPunch(employeeId, punchType) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    // Check if record exists for today
    let record = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    const now = new Date();

    if (punchType === 'IN') {
      if (record?.timeIn) {
        return { message: 'Already punched in', record };
      }
      if (!record) {
        record = await prisma.attendance.create({
          data: {
            employeeId,
            date: today,
            timeIn: now,
            remark: 'Punched in'
          }
        });
      } else {
        record = await prisma.attendance.update({
          where: { id: record.id },
          data: { timeIn: now, remark: 'Punched in' }
        });
      }
    } else if (punchType === 'OUT') {
      if (!record?.timeIn) {
        return { error: { code: 'VALIDATION_ERROR', message: 'Must punch in first' } };
      }
      if (record?.timeOut) {
        return { message: 'Already punched out', record };
      }
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: { timeOut: now, remark: 'Completed' }
      });
      // Calculate hours
      const hours = (record.timeOut - record.timeIn) / (1000 * 60 * 60);
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: { hours }
      });
    }

    return { message: `${punchType === 'IN' ? 'Punched in' : 'Punched out'} successfully`, record };
  },

  // Get attendance for specific employee (self-service)
  async listForEmployee(employeeId, month) {
    const where = { employeeId };
    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(`${month}-28T23:59:59.999Z`);
      end.setMonth(end.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }
    return prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' }
    });
  }
};