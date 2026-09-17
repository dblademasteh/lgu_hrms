import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

const MAX_EXPORT_ROWS = 5000;

export const documentAccessRepository = {
  async log({ tenantId, documentId, userId = null, action, ip = null, userAgent = null }) {
    return prisma.documentAccessLog.create({
      data: { tenantId: tenantId ?? null, documentId, userId, action, ip, userAgent },
    });
  },

  async findMany(req, opts = {}) {
    const { documentId, userId, action, from, to, page = 1, limit = 30 } = opts;
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * take;
    const where = withTenant(req, {});
    if (documentId) where.documentId = documentId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
    }

    const [items, total] = await Promise.all([
      prisma.documentAccessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { document: { select: { id: true, title: true, type: true, status: true } } },
      }),
      prisma.documentAccessLog.count({ where }),
    ]);
    return { items, total, page, limit: take };
  },

  async findForExport(req, opts = {}) {
    const { documentId, userId, action, from, to } = opts;
    const where = withTenant(req, {});
    if (documentId) where.documentId = documentId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
    }
    return prisma.documentAccessLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      include: { document: { select: { id: true, title: true } } },
    });
  },

  async timeline(req, documentId) {
    // AuditLog rows are written by the global middleware without a tenantId,
    // so scope workflow events by the (globally unique) document id instead.
    const tenantId = req.tenantId ?? null;
    const workflowWhere = {
      entity: 'documents',
      entityId: documentId,
      ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
    };
    const [access, workflow] = await Promise.all([
      prisma.documentAccessLog.findMany({
        where: withTenant(req, { documentId }),
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.auditLog.findMany({
        where: workflowWhere,
        orderBy: { timestamp: 'desc' },
        take: 200,
        select: { id: true, userId: true, action: true, ip: true, timestamp: true },
      }),
    ]);
    return { access, workflow };
  },

  async resolveUsers(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return {};
    const users = await prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, username: true, role: true },
    });
    return users.reduce((acc, u) => {
      acc[u.id] = { username: u.username, role: u.role };
      return acc;
    }, {});
  },
};
