import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { AppError } from '../lib/errors.js';
import {
  canTransition,
  requiredRoleFor,
  AUDIT_FIELDS,
} from '../shared/workflow.js';

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export const documentRepository = {
  /**
   * @param {object} req
   * @param {{type?,status?,employeeId?,search?,page?,limit?}} opts
   */
  async findMany(req, opts = {}) {
    const { type, status, employeeId, search, page = 1, limit = 30 } = opts;
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * take;
    const where = withTenant(req, {});

    if (type) where.type = type;
    if (status) where.status = status;
    if (employeeId) where.relatedEmployeeId = employeeId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: { relatedEmployee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      }),
      prisma.document.count({ where }),
    ]);
    return { items: data, total, page, limit: take };
  },

  async findById(req, id) {
    return prisma.document.findFirst({
      where: withTenant(req, { id }),
      include: { relatedEmployee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
    });
  },

  async create(req, data) {
    const stamped = stampTenant(req, {
      ...data,
      effectiveDate: data.effectiveDate ? parseDate(data.effectiveDate) : null,
    });
    return prisma.document.create({ data: stamped });
  },

  async update(req, id, data) {
    const existing = await this.findById(req, id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');

    if (data.tenantId && data.tenantId !== req.tenantId) {
      throw new AppError('Cross-tenant write denied', 403, 'TENANT_FORBIDDEN');
    }

    const updateData = { ...data };
    if (updateData.effectiveDate) {
      updateData.effectiveDate = parseDate(updateData.effectiveDate);
    }

    return prisma.document.update({
      where: { ...withTenant(req, { id }), ...(!req.isSuperAdmin ? { id } : {}) },
      data: updateData,
    });
  },

  async remove(req, id) {
    // Soft delete = archive, routed through the workflow + role gate so a
    // DELETE can never bypass the state machine.
    return this.setStatus(req, id, 'ARCHIVED');
  },

  async setStatus(req, id, status) {
    const existing = await this.findById(req, id);
    if (!existing) throw new AppError('Document not found', 404, 'NOT_FOUND');

    if (!canTransition(existing.status, status)) {
      throw new AppError(
        `Cannot transition status from ${existing.status} to ${status}`,
        409,
        'INVALID_TRANSITION'
      );
    }

    const requiredRoles = requiredRoleFor(status);
    if (requiredRoles && !requiredRoles.includes(req.user?.role)) {
      throw new AppError('You are not allowed to perform this transition', 403, 'FORBIDDEN');
    }

    const data = { status };

    const audit = AUDIT_FIELDS[status];
    if (audit) {
      data[audit.who] = req.user.id;
      data[audit.when] = new Date();
      // Clear the opposite outcome fields so the record reflects only the current state.
      if (status === 'APPROVED') {
        data.rejectedBy = null;
        data.rejectedAt = null;
      } else if (status === 'REJECTED') {
        data.approvedBy = null;
        data.approvedAt = null;
      } else if (status === 'ARCHIVED') {
        data.approvedBy = null;
        data.approvedAt = null;
        data.rejectedBy = null;
        data.rejectedAt = null;
      }
    }

    return prisma.document.update({
      where: { ...withTenant(req, { id }), ...(!req.isSuperAdmin ? { id } : {}) },
      data,
    });
  },

  async countByStatus(req) {
    const where = withTenant(req, {});
    const result = await prisma.document.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    return result.reduce((acc, r) => {
      acc[r.status] = r._count._all;
      return acc;
    }, {});
  },
};
