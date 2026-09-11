import { attendanceRepository } from '../repositories/attendanceRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

function toUtcDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T00:00:00.000Z`)
    : v;
}

export const attendanceService = {
  async list(req, date) {
    return attendanceRepository.findAll(req, date);
  },
  async create(req, data) {
    const { date, timeIn, timeOut, ...rest } = data;
    return attendanceRepository.create(req, {
      ...rest,
      date: toUtcDate(date),
      timeIn: timeIn ? new Date(timeIn) : null,
      timeOut: timeOut ? new Date(timeOut) : null,
    });
  },

  // Biometric punch in/out for employee self-service
  async biometricPunch(req, employeeId, punchType) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    // Check if record exists for today
    const baseWhere = {
      employeeId,
      date: { gte: startOfDay, lte: endOfDay }
    };
    let record = await prisma.attendance.findFirst({
      where: withTenant(req, baseWhere)
    });

    const now = new Date();

    if (punchType === 'IN') {
      if (record?.timeIn) {
        return { message: 'Already punched in', record };
      }
      if (!record) {
        record = await prisma.attendance.create({
          data: stampTenant(req, {
            employeeId,
            date: today,
            timeIn: now,
            remark: 'Punched in'
          })
        });
      } else {
        const scoped = await prisma.attendance.findFirst({ where: withTenant(req, { id: record.id }) });
        if (!scoped) return { error: { code: 'FORBIDDEN', message: 'Cross-tenant access' } };
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
      const scoped = await prisma.attendance.findFirst({ where: withTenant(req, { id: record.id }) });
      if (!scoped) return { error: { code: 'FORBIDDEN', message: 'Cross-tenant access' } };
      const timeInDate = new Date(record.timeIn);
      const hours = (now - timeInDate) / (1000 * 60 * 60);
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: { timeOut: now, hours, remark: 'Completed' }
      });
    }

    return { message: `${punchType === 'IN' ? 'Punched in' : 'Punched out'} successfully`, record };
  },

  // Get attendance for specific employee (self-service)
  async listForEmployee(req, employeeId, month) {
    const baseWhere = { employeeId };
    if (month) {
      // Handle both YYYY-MM and YYYY-MM-DD formats
      const monthStart = month.length > 7 ? month.slice(0, 7) : month;
      const start = new Date(`${monthStart}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      baseWhere.date = { gte: start, lt: end };
    }
    return prisma.attendance.findMany({
      where: withTenant(req, baseWhere),
      orderBy: { date: 'desc' }
    });
  }
};