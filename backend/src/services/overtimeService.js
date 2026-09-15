import { overtimeRepository } from '../repositories/overtimeRepository.js';
import { leaveRepository } from '../repositories/leaveRepository.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { manilaMinutes } from '../lib/time.js';

// CSC-DBM JC No. 2 s. 2015: HR = S / (22 workdays × 8 hours).
const WORKDAYS_PER_MONTH = 22;
const HOURS_PER_DAY = 8;
// 125% on a scheduled workday, 150% on rest day / holiday / special day.
const RATE_MULTIPLIER = { WORKDAY: 1.25, REST_DAY: 1.5, HOLIDAY: 1.5 };

function toUtcDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00.000Z`);
  throw new AppError('Expected YYYY-MM-DD date', 400, 'INVALID_DATE');
}

function parseHm(v) {
  if (!v) return null;
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

/** Validate an overtime entry's clock window and compute its pay from salary. */
function normalizeEntry(req, data) {
  const date = toUtcDate(data.date);
  const startMins = parseHm(data.startHm);
  const endMins = parseHm(data.endHm);
  if (startMins != null && endMins != null && endMins <= startMins) {
    throw new AppError('Overtime end must be after start', 400, 'INVALID_WINDOW');
  }
  return { date, startMins, endMins, hours: data.hours, type: data.type, notes: data.notes ?? null };
}

export const overtimeService = {
  async list(req, query) {
    return overtimeRepository.list(req, query);
  },

  async create(req, data) {
    const employee = await prisma.employee.findFirst({
      where: withTenant(req, { id: data.employeeId }),
    });
    if (!employee) throw new AppError('Employee not found in tenant', 404, 'NOT_FOUND');
    const entry = normalizeEntry(req, data);
    return overtimeRepository.create(req, {
      employeeId: data.employeeId,
      date: entry.date,
      startMins: entry.startMins,
      endMins: entry.endMins,
      hours: entry.hours,
      type: entry.type,
      status: 'PENDING',
      notes: entry.notes,
    });
  },

  async update(req, id, data) {
    const existing = await overtimeRepository.findById(req, id);
    if (!existing) throw new AppError('Overtime entry not found', 404, 'NOT_FOUND');
    if (existing.status === 'APPROVED') {
      throw new AppError('Approved overtime entries cannot be edited', 409, 'LOCKED');
    }
    return overtimeRepository.update(req, id, {
      ...(data.hours !== undefined ? { hours: data.hours } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
  },

  async remove(req, id) {
    const existing = await overtimeRepository.findById(req, id);
    if (!existing) throw new AppError('Overtime entry not found', 404, 'NOT_FOUND');
    if (existing.status === 'APPROVED') {
      throw new AppError('Approved overtime entries cannot be deleted', 409, 'LOCKED');
    }
    return overtimeRepository.softRemove(req, id);
  },

  async approve(req, id, data) {
    const existing = await overtimeRepository.findById(req, id);
    if (!existing) throw new AppError('Overtime entry not found', 404, 'NOT_FOUND');
    return overtimeRepository.approve(req, id, {
      status: data.status,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
  },

  /**
   * Project what an approved entry would pay (CSC-DBM JC 2 s. 2015) without
   * writing payroll: HR = monthlySalary/176, × 1.25 or 1.5 multiplier.
   */
  async estimatePay(req, id) {
    const entry = await overtimeRepository.findById(req, id);
    if (!entry) throw new AppError('Overtime entry not found', 404, 'NOT_FOUND');
    const employee = await prisma.employee.findFirst({
      where: withTenant(req, { id: entry.employeeId }),
    });
    if (!employee) throw new AppError('Employee not found in tenant', 404, 'NOT_FOUND');
    const hr = Number(employee.monthlySalary) / (WORKDAYS_PER_MONTH * HOURS_PER_DAY);
    const pay = Number(entry.hours) * hr * (RATE_MULTIPLIER[entry.type] ?? 1.25);
    return {
      ...entry,
      estimatedPay: Math.round(pay * 100) / 100,
      hourlyRate: Math.round(hr * 100) / 100,
    };
  },

  /** Employee-facing: only own entries. */
  async listForEmployee(req, employeeId) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const employee = user?.externalId
      ? await prisma.employee.findFirst({ where: { ...withTenant(req), employeeNumber: user.externalId } })
      : null;
    const targetId = employee?.id ?? null;
    if (!targetId || targetId !== employeeId) {
      // Only the employee themselves (or approvers) may read their OT list.
      return []; // EMPLOYEE self-scope: silently empty for non-links
    }
    return overtimeRepository.list(req, { employeeId: targetId, status: 'APPROVED' });
  },
};