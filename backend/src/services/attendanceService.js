import { attendanceRepository } from '../repositories/attendanceRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import {
  manilaDateKey,
  dateKeyToUtc,
  endOfDateKeyExclusive,
  manilaMinutes,
  normalizeTimeField,
} from '../lib/time.js';

function toUtcDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? dateKeyToUtc(v)
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
  const start = toUtcDate(date);
  const end = endOfDateKeyExclusive(manilaDateKey(start));

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

const DEFAULT_WORK_START = 8 * 60; // 08:00 Asia/Manila
const DEFAULT_WORK_END = 17 * 60;
const DEFAULT_LUNCH_START = 12 * 60;
const DEFAULT_LUNCH_END = 13 * 60;

// Punch responses carry the employee's name so a lobby kiosk can confirm who punched.
const PUNCH_WITH_EMPLOYEE = {
  employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
};

async function getActiveRule(req) {
  return prisma.attendanceRule.findFirst({
    where: withTenant(req, { active: true }),
  });
}

/** Worked hours net of the lunch break that falls inside the shift. */
function computePunchHours(timeIn, timeOut, rule) {
  const inMins = manilaMinutes(new Date(timeIn));
  const outMins = manilaMinutes(new Date(timeOut));
  const elapsed = outMins - inMins;
  if (elapsed <= 0) return 0;
  const lunchStart = rule?.lunchStartMins ?? DEFAULT_LUNCH_START;
  const lunchEnd = rule?.lunchEndMins ?? DEFAULT_LUNCH_END;
  const overlap = Math.max(0, Math.min(outMins, lunchEnd) - Math.max(inMins, lunchStart));
  return Math.max(0, (elapsed - overlap) / 60);
}

async function computeRemarkFromRules(req, timeIn, timeOut, hours) {
  if (!timeIn) return null;
  const rule = await getActiveRule(req);
  const inMins = manilaMinutes(new Date(timeIn));
  const scheduledStart = rule?.workStartMins ?? DEFAULT_WORK_START;
  const tardinessMin = Math.max(0, inMins - scheduledStart);

  if (tardinessMin > (rule?.tardinessMin ?? 0)) {
    return 'Tardiness';
  }
  const scheduledEnd = rule?.workEndMins ?? DEFAULT_WORK_END;
  const lunchLen = rule ? Math.max(0, (rule.lunchEndMins ?? DEFAULT_LUNCH_END) - (rule.lunchStartMins ?? DEFAULT_LUNCH_START)) : 60;
  const scheduledLen = Math.max(0, ((scheduledEnd - scheduledStart) - lunchLen) / 60);
  const actual = hours ?? (timeOut ? (new Date(timeOut) - new Date(timeIn)) / (1000 * 60 * 60) : 0);
  if (actual > scheduledLen) {
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
        remark = await computeRemarkFromRules(req, normalizeTimeField(timeIn, date), timeOut ? normalizeTimeField(timeOut, date) : null, hours);
      }
    }
    return attendanceRepository.create(req, {
      ...rest,
      date: utcDate,
      timeIn: normalizeTimeField(timeIn, date),
      timeOut: normalizeTimeField(timeOut, date),
      hours: hours ?? null,
      remark,
    });
  },

  async update(req, id, data) {
    const updateData = { ...data };
    const existing = await attendanceRepository.get(req, id);
    if (updateData.date) {
      updateData.date = toUtcDate(updateData.date);
    }
    const dateKey = existing?.date ? manilaDateKey(new Date(existing.date)) : manilaDateKey(new Date());
    if (updateData.timeIn !== undefined && updateData.timeIn !== null) {
      updateData.timeIn = normalizeTimeField(updateData.timeIn, updateData.date ? manilaDateKey(updateData.date) : dateKey);
      if (isFutureDate(updateData.timeIn)) {
        throw new Error('Cannot set timeIn to a future datetime');
      }
    }
    if (updateData.timeOut !== undefined && updateData.timeOut !== null) {
      updateData.timeOut = normalizeTimeField(updateData.timeOut, updateData.date ? manilaDateKey(updateData.date) : dateKey);
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
        const timeIn = normalizeTimeField(record.timeIn, record.date);
        const timeOut = normalizeTimeField(record.timeOut, record.date);
        let remark = record.remark || null;
        if (!remark) {
          const leaveRemark = await autoMarkLeave(req, employee.id, utcDate);
          if (leaveRemark) {
            remark = leaveRemark;
          } else if (record.timeIn) {
            remark = await computeRemarkFromRules(req, timeIn, timeOut, record.hours);
          }
        }
        if (existing) {
          const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              timeIn: timeIn ?? existing.timeIn,
              timeOut: timeOut ?? existing.timeOut,
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
              timeIn,
              timeOut,
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

  // Biometric punch in/out for employee self-service. The working day is the
  // Asia/Manila calendar day; a punch-IN opens a NEW row when all of today's
  // rows are closed (multi-punch), and a punch-OUT closes the latest open row.
  async biometricPunch(req, employeeId, punchType) {
    const now = new Date();
    const todayKey = manilaDateKey(now);
    const startOfDay = dateKeyToUtc(todayKey);
    const endOfDay = endOfDateKeyExclusive(todayKey);

    const todays = await prisma.attendance.findMany({
      where: withTenant(req, { employeeId, date: { gte: startOfDay, lt: endOfDay } }),
      orderBy: { timeIn: 'asc' },
      include: PUNCH_WITH_EMPLOYEE,
    });

    const open = todays.find((r) => r.timeIn && !r.timeOut);

    if (punchType === 'IN') {
      if (open) {
        return { message: 'Already punched in', record: open };
      }
      const rule = await getActiveRule(req);
      const leaveRemark = await autoMarkLeave(req, employeeId, startOfDay);
      const ruleRemark = leaveRemark || (await computeRemarkFromRules(req, now, null, 0)) || 'Punched in';
      const record = await prisma.attendance.create({
        data: stampTenant(req, {
          employeeId,
          date: startOfDay,
          timeIn: now,
          remark: ruleRemark,
        }),
        include: PUNCH_WITH_EMPLOYEE,
      });
      return { message: 'Punched in successfully', record };
    }

    // OUT
    if (!open) {
      const err = new Error(todays.length ? 'Already punched out' : 'Must punch in first');
      err.status = 400;
      err.code = 'PUNCH_CONFLICT';
      throw err;
    }
    const scoped = await prisma.attendance.findFirst({
      where: withTenant(req, { id: open.id }),
    });
    if (!scoped) throw new Error('Cross-tenant access');
    const rule = await getActiveRule(req);
    const hours = computePunchHours(new Date(scoped.timeIn), now, rule);
    const record = await prisma.attendance.update({
      where: { id: open.id },
      data: { timeOut: now, hours, remark: 'Completed' },
      include: PUNCH_WITH_EMPLOYEE,
    });
    return { message: 'Punched out successfully', record };
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
