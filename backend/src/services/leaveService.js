import { leaveRepository } from '../repositories/leaveRepository.js';
import { permissionService } from '../services/permissionService.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

const CREDIT_TYPES = new Set(['VACATION', 'SICK', 'SPECIAL_PRIVILEGE', 'SPECIAL_WOMEN']);
const VL_CAP = 30;
const SL_CAP = 15;
const SP_CAP = 5;
const SW_DAYS = 60;
const MATERNITY_DAYS = 105;
const PATERNITY_DAYS = 7;
const SOLO_PARENT_DAYS = 7;

function toUtcDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00.000Z`);
  throw new AppError('Expected YYYY-MM-DD date', 400, 'INVALID_DATE');
}

function countWorkdays(from, to) {
  let days = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function isApprover(req) {
  const perms = await permissionService.getEffectivePermissions(req.tenantId, req.user?.role);
  return !!perms.leaveApproval;
}

async function linkedEmployeeId(req) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.externalId) return null;
  return prisma.employee.findFirst({ where: { tenantId: req.tenantId, employeeNumber: user.externalId } });
}

export const leaveService = {
  async listRequests(req) {
    return leaveRepository.findAllRequests(req);
  },

  async createRequest(req, data) {
    const fromDate = toUtcDate(data.fromDate);
    const toDate = toUtcDate(data.toDate);
    if (toDate < fromDate) throw new AppError('toDate cannot be before fromDate', 400, 'VALIDATION_ERROR');

    const workdays = countWorkdays(fromDate, toDate);
    const days = data.isHalfDay ? Number((workdays * 0.5).toFixed(2)) : workdays;

    const approver = await isApprover(req);
    let employeeId = data.employeeId;
    if (!approver) {
      const self = await linkedEmployeeId(req);
      if (!self) throw new AppError('Employee linkage not found for self-service', 403, 'FORBIDDEN');
      employeeId = self.id;
    } else if (!employeeId) {
      throw new AppError('employeeId is required', 400, 'VALIDATION_ERROR');
    }

    const employee = await prisma.employee.findFirst({ where: { tenantId: req.tenantId, id: employeeId } });
    if (!employee) throw new AppError('Employee not found in tenant', 404, 'NOT_FOUND');

    if (data.isForced && !approver) {
      throw new AppError('Only approvers can file forced leave', 403, 'FORBIDDEN');
    }

    const overlap = await leaveRepository.findOverlapping(req, employeeId, fromDate, toDate, null);
    if (overlap && !data.isTerminal && !data.isForced) {
      throw new AppError('Overlapping leave request already exists', 409, 'CONFLICT');
    }

    if (data.type === 'VACATION' && !data.isLwop && !data.isTerminal && !data.advanceNoticed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let workingDays = 0;
      const deadline = new Date(today);
      while (workingDays < 5) {
        deadline.setDate(deadline.getDate() + 1);
        const day = deadline.getDay();
        if (day !== 0 && day !== 6) workingDays += 1;
      }
      if (fromDate < deadline) {
        throw new AppError('Vacation leave requires 5 working days advance notice', 400, 'ADVANCE_NOTICE_REQUIRED');
      }
    }

    if (data.type === 'SICK' && days > 3 && !data.documentUrl && !data.isLwop) {
      throw new AppError('Medical certificate required for sick leave exceeding 3 days', 400, 'DOCUMENT_REQUIRED');
    }

    if (data.isTerminal && !['VACATION', 'SICK'].includes(data.type)) {
      throw new AppError('Terminal leave is only allowed for Vacation or Sick leave', 400, 'INVALID_TERMINAL');
    }

    if (data.isTerminal && !approver) {
      throw new AppError('Only approvers can file terminal leave', 403, 'FORBIDDEN');
    }

    let creditCheckType = data.type;
    if (CREDIT_TYPES.has(creditCheckType) && !data.isLwop) {
      const requestYear = fromDate.getUTCFullYear();
      const credits = await leaveRepository.findCredits(req, employeeId);
      const sameYear = credits.filter(c => c.type === creditCheckType && c.year === requestYear);
      const prior = credits.filter(c => c.type === creditCheckType && c.year < requestYear).sort((a, b) => b.year - a.year)[0];
      const credit = sameYear[0] ?? prior;
      const balance = credit?.balance ?? 0;
      if (balance < days) {
        throw new AppError('Insufficient leave credit balance; mark as LWOP or request fewer days', 400, 'INSUFFICIENT_CREDIT');
      }
    }

    return leaveRepository.createRequest(req, {
      employeeId,
      type: data.type,
      fromDate,
      toDate,
      days,
      reason: data.reason ?? null,
      status: 'PENDING',
      isHalfDay: !!data.isHalfDay,
      isLwop: !!data.isLwop,
      isTerminal: !!data.isTerminal,
      isForced: !!data.isForced,
      studyBondMonths: data.studyBondMonths ?? null,
      documentUrl: data.documentUrl ?? null,
      advanceNoticed: !!data.advanceNoticed,
    });
  },

  async updateRequest(req, id, data) {
    const existing = await leaveRepository.findRequest(req, id);
    if (!existing) throw new AppError('Leave request not found', 404, 'NOT_FOUND');

    const deptScope = (await import('../middleware/departmentScope.js')).getDepartmentScope(req);
    if (deptScope && existing.employee?.departmentId !== deptScope) {
      const err = new Error('Cross-department access denied');
      err.status = 403; err.code = 'DEPARTMENT_FORBIDDEN'; throw err;
    }

    if (existing.isTerminal && ['APPROVED', 'DENIED', 'CANCELLED'].includes(existing.status) && data.status && data.status !== 'CANCELLED') {
      throw new AppError('Terminal leave cannot change status except cancellation', 409, 'INVALID_TRANSITION');
    }

    const transition = (from, to) => {
      if (from === 'PENDING') return ['RECOMMENDED', 'APPROVED', 'DENIED', 'CANCELLED'].includes(to);
      if (from === 'RECOMMENDED') return ['APPROVED', 'DENIED', 'CANCELLED'].includes(to);
      return false;
    };

    if (data.status && !transition(existing.status, data.status)) {
      throw new AppError(`Cannot change status from ${existing.status} to ${data.status}`, 409, 'INVALID_TRANSITION');
    }

    const updatePayload = { ...data };
    if (updatePayload.note !== undefined) {
      updatePayload.decisionNote = updatePayload.note;
      delete updatePayload.note;
    }
    if (updatePayload.recommendedAt && typeof updatePayload.recommendedAt === 'string') {
      updatePayload.recommendedAt = toUtcDate(updatePayload.recommendedAt);
    }
    if (updatePayload.approvedAt && typeof updatePayload.approvedAt === 'string') {
      updatePayload.approvedAt = toUtcDate(updatePayload.approvedAt);
    }
    if (updatePayload.deniedAt && typeof updatePayload.deniedAt === 'string') {
      updatePayload.deniedAt = toUtcDate(updatePayload.deniedAt);
    }
    delete updatePayload.status;

    if (data.status === 'RECOMMENDED') {
      updatePayload.recommendedBy = data.recommendedBy ?? req.user.id;
      updatePayload.recommendedAt = data.recommendedAt ?? new Date();
    }

    if (data.status === 'APPROVED') {
      if (CREDIT_TYPES.has(existing.type) && !existing.isLwop) {
        const currentYear = existing.fromDate.getUTCFullYear();
        await prisma.$transaction(async (tx) => {
          await leaveRepository.updateRequestStatus(req, id, {
            ...updatePayload,
            status: 'APPROVED',
            approvedBy: data.approvedBy ?? req.user.id,
            approvedAt: data.approvedAt ?? new Date(),
            decisionNote: data.decisionNote ?? existing.decisionNote,
          });
          const credit = await tx.leaveCredit.findFirst({
            where: { tenantId: req.tenantId, employeeId: existing.employeeId, type: existing.type, year: currentYear },
          });
          if (!credit) throw new AppError('Leave credit missing for approval', 400, 'INVALID_STATE');
          await tx.leaveCredit.update({
            where: { id: credit.id },
            data: { balance: { decrement: existing.days } },
          });
        });
        return leaveRepository.findRequest(req, id);
      }
      return leaveRepository.updateRequestStatus(req, id, {
        ...updatePayload,
        status: 'APPROVED',
        approvedBy: data.approvedBy ?? req.user.id,
        approvedAt: data.approvedAt ?? new Date(),
        decisionNote: data.decisionNote ?? existing.decisionNote,
      });
    }

    if (data.status === 'DENIED') {
      return leaveRepository.updateRequestStatus(req, id, {
        ...updatePayload,
        status: 'DENIED',
        deniedBy: data.deniedBy ?? req.user.id,
        deniedAt: data.deniedAt ?? new Date(),
        decisionNote: data.decisionNote ?? existing.decisionNote,
      });
    }

    if (data.status === 'CANCELLED') {
      return leaveRepository.updateRequestStatus(req, id, {
        ...updatePayload,
        status: 'CANCELLED',
        decisionNote: data.decisionNote ?? existing.decisionNote,
      });
    }

    return leaveRepository.updateRequestStatus(req, id, { ...updatePayload, status: data.status });
  },

  async listCredits(req, employeeId) {
    await reconcileCredits(req, employeeId);
    return leaveRepository.findCredits(req, employeeId);
  },

  async reconcile(req, employeeId) {
    await reconcileCredits(req, employeeId);
    return leaveRepository.findCredits(req, employeeId);
  },

  async monetize(req, id, data) {
    const existing = await leaveRepository.findRequest(req, id);
    if (!existing) throw new AppError('Leave request not found', 404, 'NOT_FOUND');
    if (!existing.isTerminal) throw new AppError('Only terminal leave can be monetized', 400, 'INVALID_STATE');
    if (existing.status !== 'APPROVED') throw new AppError('Terminal leave must be approved before monetization', 400, 'INVALID_STATE');
    if (existing.monetized) throw new AppError('Leave already monetized', 409, 'CONFLICT');

    if (!['VACATION', 'SICK'].includes(existing.type)) {
      throw new AppError('Only vacation and sick leave can be monetized', 400, 'INVALID_TYPE');
    }

    const currentYear = existing.fromDate.getUTCFullYear();
    await prisma.$transaction(async (tx) => {
      const credit = await tx.leaveCredit.findFirst({
        where: { tenantId: req.tenantId, employeeId: existing.employeeId, type: existing.type, year: currentYear },
      });
      if (!credit) throw new AppError('Leave credit missing', 400, 'INVALID_STATE');
      const unused = Math.max(0, Number(credit.balance) - existing.days);
      const amount = Number((unused * (data.monetizedAmount || 0)).toFixed(2));
      await leaveRepository.updateRequestStatus(req, id, {
        status: 'APPROVED',
        monetized: true,
        monetizedAt: new Date(),
        monetizedAmount: amount,
        decisionNote: data.note ?? existing.decisionNote,
      });
    });
    return leaveRepository.findRequest(req, id);
  },
};

async function reconcileCredits(req, employeeId) {
  const rules = await leaveRepository.findLeaveRuleConfigs(req);
  if (!rules.length) return;
  const now = new Date();
  const year = now.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));

  const fixedCredits = [
    { type: 'VACATION', balance: 15 },
    { type: 'SICK', balance: 15 },
    { type: 'SPECIAL_PRIVILEGE', balance: 5 },
    { type: 'SPECIAL_WOMEN', balance: 60 },
    { type: 'MATERNITY', balance: 105 },
    { type: 'PATERNITY', balance: 7 },
    { type: 'SOLO_PARENT', balance: 7 },
  ];
  const existing = await leaveRepository.findCredits(req, employeeId);
  for (const fc of fixedCredits) {
    const has = existing.some(c => c.type === fc.type && c.year === year);
    if (!has) await leaveRepository.createLeaveCredit(req, employeeId, fc.type, year, fc.balance);
  }

  for (const rule of rules) {
    if ((rule.accrualPerMonth ?? 0) <= 0) continue;
    const effective = new Date(rule.effectiveFrom);
    if (effective > now) continue;
    const effectiveTo = rule.effectiveTo ? new Date(rule.effectiveTo) : null;
    if (effectiveTo && effectiveTo < yearStart) continue;
    const start = effective > yearStart ? effective : yearStart;
    const end = effectiveTo && effectiveTo < now ? effectiveTo : now;
    const monthsAccrued = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
    if (monthsAccrued <= 0) continue;
    let balance = Number((rule.accrualPerMonth * monthsAccrued).toFixed(2));
    if (rule.maxCarryOver && balance > rule.maxCarryOver) balance = rule.maxCarryOver;
    const existing = await leaveRepository.findLeaveCredit(req, employeeId, rule.leaveType, year);
    if (!existing) await leaveRepository.createLeaveCredit(req, employeeId, rule.leaveType, year, balance);
  }
}
