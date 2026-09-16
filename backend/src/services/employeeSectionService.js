import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

/**
 * Generic CRUD for CSC 201 employee sub-records.
 * Each section: { model, requiredFields, dateFields, orderBy }
 */
export const SECTIONS = {
  eligibilities: {
    model: 'eligibility',
    required: ['eligibilityType'],
    dates: ['examDate', 'validUntil'],
    orderBy: { createdAt: 'desc' },
  },
  family: {
    model: 'familyMember',
    required: ['relationship', 'firstName', 'lastName'],
    dates: ['birthDate'],
    defaults: ['isDependent'],
    orderBy: { createdAt: 'asc' },
  },
  education: {
    model: 'educationRecord',
    required: ['level', 'school'],
    dates: ['fromDate', 'toDate'],
    orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
  },
  awards: {
    model: 'award',
    required: ['title'],
    dates: ['dateGiven'],
    orderBy: { createdAt: 'desc' },
  },
  history: {
    model: 'employmentHistory',
    required: ['departmentId', 'positionId', 'startDate'],
    dates: ['startDate', 'endDate'],
    orderBy: { startDate: 'desc' },
  },
};

/** Read-only relation views for the DetailPane (managed via their own modules). */
export const RELATIONS = {
  appointments: {
    model: 'appointment',
    orderBy: { startDate: 'desc' },
  },
  leave: {
    model: 'leaveRequest',
    orderBy: { fromDate: 'desc' },
  },
  leaveCredits: {
    model: 'leaveCredit',
    orderBy: [{ year: 'desc' }, { type: 'asc' }],
  },
  attendance: {
    model: 'attendance',
    orderBy: { date: 'desc' },
    take: 30,
  },
  payroll: {
    model: 'payrollItem',
    orderBy: { createdAt: 'desc' },
    include: { run: { include: { period: true } } },
  },
  performance: {
    model: 'performanceReview',
    orderBy: { reviewYear: 'desc' },
  },
  training: {
    model: 'trainingEnrollment',
    orderBy: { enrolledAt: 'desc' },
    include: { program: true },
  },
  loans: {
    model: 'loan',
    orderBy: { startDate: 'desc' },
  },
};

export const ALL_SECTIONS = { ...SECTIONS, ...Object.fromEntries(
  Object.entries(RELATIONS).map(([k, v]) => [k, { ...v, readOnly: true }])
) };

function sectionOrThrow(name) {
  const cfg = ALL_SECTIONS[name];
  if (!cfg) throw new AppError('Unknown employee section', 404, 'NOT_FOUND');
  return cfg;
}

/**
 * Translate Prisma request errors into client-facing 400s/409s (bad FK,
 * duplicate, null violation, unknown field) instead of leaking a 500.
 */
function prismaError(e, section) {
  if (e?.code && String(e.code).startsWith('P2')) {
    const lastLine = String(e.message || '').split('\n').filter(Boolean).pop() || 'Invalid data';
    if (e.code === 'P2002') throw new AppError(`Section "${section}": a record with that unique value already exists`, 409, 'DUPLICATE');
    if (e.code === 'P2003') throw new AppError(`Section "${section}": referenced record does not exist`, 400, 'VALIDATION_ERROR');
    if (e.code === 'P2025') throw new AppError(`Section "${section}": record not found`, 404, 'NOT_FOUND');
    throw new AppError(`Section "${section}": ${lastLine}`, 400, 'VALIDATION_ERROR');
  }
  throw e;
}

function assertWritable(cfg, name) {
  if (cfg.readOnly) throw new AppError(`Section "${name}" is read-only`, 405, 'READ_ONLY');
}

/** Ensure the employee exists, is not soft-deleted, and belongs to the request tenant. */
export async function assertEmployee(req, employeeId) {
  const emp = await prisma.employee.findFirst({
    where: withTenant(req, { id: employeeId, deletedAt: null }),
    select: { id: true },
  });
  if (!emp) throw new AppError('Employee not found', 404, 'NOT_FOUND');
}

function coerceDates(cfg, data) {
  const out = { ...data };
  for (const key of cfg.dates) {
    if (typeof out[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(out[key])) {
      out[key] = new Date(`${out[key]}T00:00:00.000Z`);
    } else if (out[key] === '') {
      out[key] = null;
    }
  }
  return out;
}

export const employeeSectionService = {
  async list(req, section, employeeId) {
    const cfg = sectionOrThrow(section);
    await assertEmployee(req, employeeId);
    return prisma[cfg.model].findMany({
      where: withTenant(req, { employeeId }),
      orderBy: cfg.orderBy,
      ...(cfg.include ? { include: cfg.include } : {}),
      ...(cfg.take ? { take: cfg.take } : {}),
    });
  },

  async create(req, section, employeeId, data) {
    const cfg = sectionOrThrow(section);
    assertWritable(cfg, section);
    await assertEmployee(req, employeeId);
    for (const f of cfg.required) {
      if (data[f] === undefined || data[f] === null || data[f] === '') {
        throw new AppError(`${f} is required`, 400, 'VALIDATION_ERROR');
      }
    }
    // Omit explicit nulls for fields with DB defaults (e.g. isDependent):
    // a non-nullable Boolean with @default(false) rejects `null`.
    const payload = { ...coerceDates(cfg, data) };
    for (const [k, v] of Object.entries(payload)) {
      if (v === null && cfg.defaults?.includes(k)) delete payload[k];
    }
    try {
      return await prisma[cfg.model].create({
        data: stampTenant(req, { ...payload, employeeId }),
      });
    } catch (e) {
      prismaError(e, section);
    }
  },

  async update(req, section, employeeId, recordId, data) {
    const cfg = sectionOrThrow(section);
    assertWritable(cfg, section);
    await assertEmployee(req, employeeId);
    const existing = await prisma[cfg.model].findFirst({ where: withTenant(req, { id: recordId, employeeId }) });
    if (!existing) throw new AppError('Record not found', 404, 'NOT_FOUND');
    try {
      return await prisma[cfg.model].update({
        where: { id: recordId },
        data: coerceDates(cfg, data),
      });
    } catch (e) {
      prismaError(e, section);
    }
  },

  async remove(req, section, employeeId, recordId) {
    const cfg = sectionOrThrow(section);
    assertWritable(cfg, section);
    await assertEmployee(req, employeeId);
    const existing = await prisma[cfg.model].findFirst({ where: withTenant(req, { id: recordId, employeeId }) });
    if (!existing) throw new AppError('Record not found', 404, 'NOT_FOUND');
    try {
      await prisma[cfg.model].delete({ where: { id: recordId } });
    } catch (e) {
      prismaError(e, section);
    }
  },
};
