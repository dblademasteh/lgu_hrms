import { attendanceRepository } from '../repositories/attendanceRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { AppError } from '../lib/errors.js';
import { dispatchWebhooks } from './webhookDispatch.js';
import {
  manilaDateKey,
  dateKeyToUtc,
  endOfDateKeyExclusive,
  manilaMinutes,
  normalizeTimeField,
} from '../lib/time.js';

function toUtcDate(v) {
  if (typeof v !== 'string') return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dateKeyToUtc(v);
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) return new Date(`1970-01-01T${v}.000Z`);
  return new Date(v);
}

function isFutureDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target > today;
}

// All helpers below accept a Prisma client and an explicit tenantId so they
// work both on the plain client AND inside a punch transaction.
async function autoMarkLeave(client, tenantId, employeeId, date) {
  const start = toUtcDate(date);
  const end = endOfDateKeyExclusive(manilaDateKey(start));

  const approvedLeave = await client.leaveRequest.findFirst({
    where: {
      tenantId,
      employeeId,
      status: 'APPROVED',
      fromDate: { lte: end },
      toDate: { gte: start },
    }
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

async function getActiveRule(client, tenantId) {
  return client.attendanceRule.findFirst({
    where: { tenantId, active: true },
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

async function computeRemarkFromRules(client, tenantId, timeIn, timeOut, hours) {
  if (!timeIn) return null;
  const rule = await getActiveRule(client, tenantId);
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

async function computePunchInRemark(client, tenantId, employeeId, startOfDay, at) {
  const leaveRemark = await autoMarkLeave(client, tenantId, employeeId, startOfDay);
  if (leaveRemark) return leaveRemark;
  return (await computeRemarkFromRules(client, tenantId, at, null, 0)) || 'Punched in';
}

// Punch-OUT recomputes the remark from the actual IN/OUT so a late start keeps
// "Tardiness" (and a long day keeps "Overtime") instead of being replaced with
// a generic "Completed".
async function computePunchOutRemark(client, tenantId, employeeId, startOfDay, scoped, outAt, hours) {
  const leaveRemark = await autoMarkLeave(client, tenantId, employeeId, startOfDay);
  if (leaveRemark) return leaveRemark;
  return (await computeRemarkFromRules(client, tenantId, scoped.timeIn, outAt, hours)) || 'Completed';
}

/**
 * IN/OUT state transition for the working day (Asia/Manila calendar day).
 *
 * - `punchType === 'IN'`: opens a NEW row when all of today's rows are closed
 *   (multi-punch day).
 * - `punchType === 'OUT'`: closes the latest open row, computing hours.
 * - `punchType === null` (device pulls): inferred from row state — an open row
 *   is closed (OUT), otherwise a row is opened (IN).
 *
 * Runs inside a SERIALIZABLE transaction with a conditional `timeOut: null`
 * update, so two simultaneous OUTs (or double-tap kiosk + device poll) cannot
 * double-write, and two simultaneous INs cannot create duplicate open rows.
 * A serialization conflict (P2028) is retried once after re-reading state.
 */
async function punchTransition(req, employeeId, punchType, at, source, ref) {
  const tenantId = req.tenantId;
  const todayKey = manilaDateKey(at);
  const startOfDay = dateKeyToUtc(todayKey);
  const endOfDay = endOfDateKeyExclusive(todayKey);

  const attempt = async () =>
    prisma.$transaction(async (tx) => {
      const todays = await tx.attendance.findMany({
        where: { tenantId, employeeId, date: { gte: startOfDay, lt: endOfDay } },
        orderBy: { timeIn: 'asc' },
        include: PUNCH_WITH_EMPLOYEE,
      });

      const open = todays.find((r) => r.timeIn && !r.timeOut);
      const action = punchType ?? (open ? 'OUT' : 'IN');

      if (action === 'IN') {
        if (open) {
          return { message: 'Already punched in', record: open };
        }
        const remark = await computePunchInRemark(tx, tenantId, employeeId, startOfDay, at);
        const record = await tx.attendance.create({
          data: {
            tenantId,
            employeeId,
            date: startOfDay,
            timeIn: at,
            remark,
            source,
            deviceRef: ref ?? null,
          },
          include: PUNCH_WITH_EMPLOYEE,
        });
        return { message: 'Punched in successfully', record };
      }

      // OUT
      if (!open) {
        throw new AppError(todays.length ? 'Already punched out' : 'Must punch in first', 400, 'PUNCH_CONFLICT');
      }
      const scoped = await tx.attendance.findFirst({ where: { tenantId, id: open.id } });
      if (!scoped) throw new AppError('Cross-tenant access', 403, 'FORBIDDEN');

      const rule = await getActiveRule(tx, tenantId);
      const hours = computePunchHours(new Date(scoped.timeIn), at, rule);
      const remark = await computePunchOutRemark(tx, tenantId, employeeId, startOfDay, scoped, at, hours);

      const updated = await tx.attendance.updateMany({
        where: { id: scoped.id, tenantId, timeOut: null },
        data: { timeOut: at, hours, remark, source, deviceRef: ref ?? null },
      });
      if (updated.count === 0) {
        throw new AppError('Already punched out', 400, 'PUNCH_CONFLICT');
      }

      const record = await tx.attendance.findUnique({
        where: { id: scoped.id },
        include: PUNCH_WITH_EMPLOYEE,
      });
      return { message: 'Punched out successfully', record };
    }, { isolationLevel: 'Serializable' });

  try {
    return await attempt();
  } catch (e) {
    if (e?.code === 'P2028') return attempt();
    throw e;
  }
}

export const attendanceService = {
  async list(req, date) {
    return attendanceRepository.findAll(req, date);
  },
   async create(req, data) {
     const { date, timeIn, timeOut, hours, ...rest } = data;
     const utcDate = toUtcDate(date);
     if (isFutureDate(utcDate)) {
       throw new AppError('Cannot create attendance for future dates', 400, 'FUTURE_DATE');
     }
     const employeeId = rest.employeeId;
     let remark = data.remark || null;
     if (!remark) {
       const leaveRemark = await autoMarkLeave(prisma, req.tenantId, employeeId, utcDate);
       if (leaveRemark) {
         remark = leaveRemark;
       } else if (timeIn) {
         remark = await computeRemarkFromRules(prisma, req.tenantId, normalizeTimeField(timeIn, date), timeOut ? normalizeTimeField(timeOut, date) : null, hours);
       }
     }
     const record = await attendanceRepository.create(req, {
       ...rest,
       date: utcDate,
       timeIn: normalizeTimeField(timeIn, date),
       timeOut: normalizeTimeField(timeOut, date),
       hours: hours ?? null,
       remark,
       source: 'MANUAL',
     });
     dispatchWebhooks(req.tenantId, 'attendance.created', { attendanceId: record.id, employeeId: record.employeeId, date: manilaDateKey(record.date), timeIn: record.timeIn, timeOut: record.timeOut, hours: record.hours }).catch(() => {});
     return record;
   },

  async update(req, id, data) {
    const updateData = { ...data };
    const existing = await attendanceRepository.get(req, id);
    if (!existing) return null;

    if (updateData.date) {
      updateData.date = toUtcDate(updateData.date);
    }
    const dateKey = manilaDateKey(new Date(existing.date));
    if (updateData.timeIn !== undefined && updateData.timeIn !== null) {
      updateData.timeIn = normalizeTimeField(updateData.timeIn, updateData.date ? manilaDateKey(updateData.date) : dateKey);
      if (isFutureDate(updateData.timeIn)) {
        throw new AppError('Cannot set timeIn to a future datetime', 400, 'FUTURE_DATE');
      }
    }
    if (updateData.timeOut !== undefined && updateData.timeOut !== null) {
      updateData.timeOut = normalizeTimeField(updateData.timeOut, updateData.date ? manilaDateKey(updateData.date) : dateKey);
      if (isFutureDate(updateData.timeOut)) {
        throw new AppError('Cannot set timeOut to a future datetime', 400, 'FUTURE_DATE');
      }
    }
    if (updateData.hours !== undefined) {
      updateData.hours = Math.max(0, Math.min(24, Number(updateData.hours)));
    }
    // Recompute remark in the same write (no unscoped second update) whenever a
    // time field changed and the caller did not provide an explicit remark.
    if (!updateData.remark && updateData.timeIn !== undefined) {
      const timeIn = updateData.timeIn ?? existing.timeIn;
      const timeOut = updateData.timeOut !== undefined ? updateData.timeOut : existing.timeOut;
      const hours = updateData.hours !== undefined ? updateData.hours : existing.hours;
      const ruleRemark = await computeRemarkFromRules(prisma, req.tenantId, timeIn, timeOut, hours);
      if (ruleRemark) updateData.remark = ruleRemark;
    }

     const record = await attendanceRepository.update(req, id, updateData);
     if (record) {
       dispatchWebhooks(req.tenantId, 'attendance.updated', { attendanceId: record.id, employeeId: record.employeeId, date: manilaDateKey(record.date), timeIn: record.timeIn, timeOut: record.timeOut, hours: record.hours }).catch(() => {});
     }
     return record;
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
          const leaveRemark = await autoMarkLeave(prisma, req.tenantId, employee.id, utcDate);
          if (leaveRemark) {
            remark = leaveRemark;
          } else if (record.timeIn) {
            remark = await computeRemarkFromRules(prisma, req.tenantId, timeIn, timeOut, record.hours);
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
            data: {
              tenantId: req.tenantId,
              employeeId: employee.id,
              date: utcDate,
              timeIn,
              timeOut,
              hours: record.hours ?? null,
              remark,
              source: 'IMPORT',
            },
          });
          results.push({ status: 'created', id: created.id, employeeNumber: record.employeeNumber });
        }
      } catch (e) {
        results.push({ status: 'error', employeeNumber: record.employeeNumber, message: e.message });
      }
    }
    return results;
  },

  // Ingest a punch event from an external attendance system.
  async ingestPunch(req, data) {
    const { employeeNumber, punchType, at, deviceId, source } = data;
    const employee = await prisma.employee.findFirst({
      where: withTenant(req, { employeeNumber }),
      select: { id: true },
    });
    if (!employee) {
      throw new AppError(`Employee "${employeeNumber}" not found`, 404, 'EMPLOYEE_NOT_FOUND');
    }
    const punchAt = at ? new Date(at) : new Date();
    const result = await punchTransition(req, employee.id, punchType ?? null, punchAt, source ?? 'IMPORT', deviceId ?? null);
    if (result.record) {
      const dateKey = manilaDateKey(result.record.date);
      dispatchWebhooks(req.tenantId, 'attendance.created', { attendanceId: result.record.id, employeeId: result.record.employeeId, date: dateKey, timeIn: result.record.timeIn, timeOut: result.record.timeOut, hours: result.record.hours }).catch(() => {});
    }
    return result;
  },

  // Bulk ingest attendance records from an external system.
  async bulkIngest(req, records) {
    const results = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const record of records) {
        try {
          const employee = await tx.employee.findFirst({
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
          const existing = await tx.attendance.findFirst({
            where: withTenant(req, { employeeId: employee.id, date: utcDate }),
          });
          const timeIn = record.timeIn ? normalizeTimeField(record.timeIn, record.date) : null;
          const timeOut = record.timeOut ? normalizeTimeField(record.timeOut, record.date) : null;
          let remark = record.remark || null;
          if (!remark) {
            const leaveRemark = await autoMarkLeave(tx, req.tenantId, employee.id, utcDate);
            if (leaveRemark) remark = leaveRemark;
          }
          if (existing) {
            const updated = await tx.attendance.update({
              where: { id: existing.id },
              data: {
                timeIn: timeIn ?? existing.timeIn,
                timeOut: timeOut ?? existing.timeOut,
                hours: record.hours ?? existing.hours,
                remark,
                source: record.source || existing.source,
              },
            });
            results.push({ status: 'updated', id: updated.id, employeeNumber: record.employeeNumber });
          } else {
            const created = await tx.attendance.create({
              data: {
                tenantId: req.tenantId,
                employeeId: employee.id,
                date: utcDate,
                timeIn,
                timeOut,
                hours: record.hours ?? null,
                remark,
                source: record.source || 'IMPORT',
              },
            });
            results.push({ status: 'created', id: created.id, employeeNumber: record.employeeNumber });
          }
        } catch (e) {
          results.push({ status: 'error', employeeNumber: record.employeeNumber, message: e.message });
        }
      }
      return results;
    });
    const createdOrUpdated = results.filter(r => r.status === 'created' || r.status === 'updated');
    if (createdOrUpdated.length) {
      dispatchWebhooks(req.tenantId, 'attendance.bulk_updated', { count: createdOrUpdated.length, records: createdOrUpdated }).catch(() => {});
    }
    return results;
  },

  // Biometric punch in/out for employee self-service (and kiosk / device pulls).
  async biometricPunch(req, employeeId, punchType) {
    const result = await punchTransition(req, employeeId, punchType, new Date(), 'PUNCH', null);
    if (result.record) {
      const dateKey = manilaDateKey(result.record.date);
      dispatchWebhooks(req.tenantId, 'attendance.created', { attendanceId: result.record.id, employeeId: result.record.employeeId, date: dateKey, timeIn: result.record.timeIn, timeOut: result.record.timeOut, hours: result.record.hours }).catch(() => {});
    }
    return result;
  },

  // Ingest a punch event pulled from a ZK biometric terminal. IN/OUT is
  // inferred from row state on the same Asia/Manila calendar day as the punch;
  // `ref` records provenance as "DEVICE:<deviceId>:<logId>".
  async devicePunch(req, employeeId, at, ref) {
    const result = await punchTransition(req, employeeId, null, at, 'DEVICE', ref);
    if (result.record) {
      const dateKey = manilaDateKey(result.record.date);
      dispatchWebhooks(req.tenantId, 'attendance.created', { attendanceId: result.record.id, employeeId: result.record.employeeId, date: dateKey, timeIn: result.record.timeIn, timeOut: result.record.timeOut, hours: result.record.hours }).catch(() => {});
    }
    return result;
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