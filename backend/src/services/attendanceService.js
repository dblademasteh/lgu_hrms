import { attendanceRepository } from '../repositories/attendanceRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

function toUtcDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T00:00:00.000Z`)
    : v;
}

function isFutureDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target > today;
}

async function autoMarkLeave(req, employeeId, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const approvedLeave = await prisma.leaveRequest.findFirst({
    where: withTenant(req, {
      employeeId,
      status: 'APPROVED',
      fromDate: { lte: end },
      toDate: { gte: start },
    })
  });
  if (!approvedLeave) return null;
  return 'On leave';
}

async function computeRemarkFromRules(req, timeIn, timeOut, hours) {
  if (!timeIn) return null;
  const rule = await prisma.attendanceRule.findFirst({
    where: withTenant(req, { active: true }),
  });
  if (!rule) return null;

  const start = new Date(timeIn);
  const scheduledStart = new Date(start);
  scheduledStart.setHours(8, 0, 0, 0);
  const tardinessMin = Math.max(0, (start - scheduledStart) / (1000 * 60));

  if (tardinessMin > rule.tardinessMin) {
    return 'Tardiness';
  }
  if (hours && hours > 8) {
    return 'Overtime';
  }
  return 'On time';
}

export const attendanceService = {
  async list(req, date) {
    return attendanceRepository.findAll(req, date);
  },
  async create(req, data) {
    const { date, timeIn, timeOut, hours, ...rest } = data;
    const utcDate = toUtcDate(date);
    if (isFutureDate(utcDate)) {
      throw new Error('Cannot create attendance for future dates');
    }
    const employeeId = rest.employeeId;
    let remark = data.remark || null;
    if (!remark) {
      const leaveRemark = await autoMarkLeave(req, employeeId, utcDate);
      if (leaveRemark) {
        remark = leaveRemark;
      } else if (timeIn) {
        remark = await computeRemarkFromRules(req, new Date(timeIn), timeOut ? new Date(timeOut) : null, hours);
      }
    }
    return attendanceRepository.create(req, {
      ...rest,
      date: utcDate,
      timeIn: timeIn ? new Date(timeIn) : null,
      timeOut: timeOut ? new Date(timeOut) : null,
      hours: hours ?? null,
      remark,
    });
  },

  async update(req, id, data) {
    const updateData = { ...data };
    if (updateData.date) {
      updateData.date = toUtcDate(updateData.date);
    }
    if (updateData.timeIn) {
      updateData.timeIn = new Date(updateData.timeIn);
      if (isFutureDate(updateData.timeIn)) {
        throw new Error('Cannot set timeIn to a future datetime');
      }
    }
    if (updateData.timeOut) {
      updateData.timeOut = new Date(updateData.timeOut);
      if (isFutureDate(updateData.timeOut)) {
        throw new Error('Cannot set timeOut to a future datetime');
      }
    }
    if (updateData.hours !== undefined) {
      updateData.hours = Math.max(0, Math.min(24, Number(updateData.hours)));
    }
    const result = await attendanceRepository.update(req, id, updateData);
    if (result && !updateData.remark && updateData.timeIn) {
      const ruleRemark = await computeRemarkFromRules(req, updateData.timeIn, updateData.timeOut || null, updateData.hours);
      if (ruleRemark) {
        await prisma.attendance.update({ where: { id }, data: { remark: ruleRemark } });
        return { ...result, remark: ruleRemark };
      }
    }
    return result;
  },

  async remove(req, id) {
    return attendanceRepository.remove(req, id);
  },

  async bulkImport(req, records) {
    const results = [];
    for (const record of records) {
      try {
        const employee = await prisma.employee.findFirst({
          where: withTenant(req, { employeeNumber: record.employeeNumber }),
        });
        if (!employee) {
          results.push({ status: 'error', employeeNumber: record.employeeNumber, message: 'Employee not found' });
          continue;
        }
        const utcDate = toUtcDate(record.date);
        if (isFutureDate(utcDate)) {
          results.push({ status: 'error', employeeNumber: record.employeeNumber, message: 'Future date' });
          continue;
        }
        const existing = await prisma.attendance.findFirst({
          where: withTenant(req, { employeeId: employee.id, date: utcDate }),
        });
        let remark = record.remark || null;
        if (!remark) {
          const leaveRemark = await autoMarkLeave(req, employee.id, utcDate);
          if (leaveRemark) {
            remark = leaveRemark;
          } else if (record.timeIn) {
            remark = await computeRemarkFromRules(req, new Date(record.timeIn), record.timeOut ? new Date(record.timeOut) : null, record.hours);
          }
        }
        if (existing) {
          const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              timeIn: record.timeIn ? new Date(record.timeIn) : existing.timeIn,
              timeOut: record.timeOut ? new Date(record.timeOut) : existing.timeOut,
              hours: record.hours ?? existing.hours,
              remark,
            },
          });
          results.push({ status: 'updated', id: updated.id, employeeNumber: record.employeeNumber });
        } else {
          const created = await prisma.attendance.create({
            data: stampTenant(req, {
              employeeId: employee.id,
              date: utcDate,
              timeIn: record.timeIn ? new Date(record.timeIn) : null,
              timeOut: record.timeOut ? new Date(record.timeOut) : null,
              hours: record.hours ?? null,
              remark,
            }),
          });
          results.push({ status: 'created', id: created.id, employeeNumber: record.employeeNumber });
        }
      } catch (e) {
        results.push({ status: 'error', employeeNumber: record.employeeNumber, message: e.message });
      }
    }
    return results;
  },

  // Biometric punch in/out for employee self-service
  async biometricPunch(req, employeeId, punchType) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

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
        const leaveRemark = await autoMarkLeave(req, employeeId, today);
        const ruleRemark = leaveRemark || await computeRemarkFromRules(req, now, null, 0);
        record = await prisma.attendance.create({
          data: stampTenant(req, {
            employeeId,
            date: today,
            timeIn: now,
            remark: ruleRemark || 'Punched in'
          })
        });
      } else {
        const scoped = await prisma.attendance.findFirst({ where: withTenant(req, { id: record.id }) });
        if (!scoped) throw new Error('Cross-tenant access');
        const leaveRemark = await autoMarkLeave(req, employeeId, today);
        const ruleRemark = leaveRemark || await computeRemarkFromRules(req, now, null, 0);
        record = await prisma.attendance.update({
          where: { id: record.id },
          data: { timeIn: now, remark: ruleRemark || 'Punched in' }
        });
      }
    }
    else if (punchType === 'OUT') {
      if (!record?.timeIn) {
        throw new Error('Must punch in first');
      }
      if (record?.timeOut) {
        return { message: 'Already punched out', record };
      }
      const scoped = await prisma.attendance.findFirst({ where: withTenant(req, { id: record.id }) });
      if (!scoped) throw new Error('Cross-tenant access');
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
