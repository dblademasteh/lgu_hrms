import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const disqualificationRepository = {
  async findAll(req, { page = 1, limit = 50, status, type, reason, search } = {}) {
    const where = withTenant(req, {});

    if (status !== undefined && status !== '') {
      where.isBarred = status === 'active';
    }
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (search) {
      where.OR = [
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { employeeNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.disqualification.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, status: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.disqualification.count({ where }),
    ]);

    return { records, total, page, limit };
  },

  async findById(req, id) {
    const scope = withTenant(req, { id });
    return prisma.disqualification.findFirst({
      where: scope,
      include: { employee: true },
    });
  },

  async create(req, data) {
    const stamped = stampTenant(req, data);
    return prisma.disqualification.create({
      data: stamped,
      include: { employee: true },
    });
  },

  async update(req, id, data) {
    const scope = withTenant(req, { id });
    const existing = await prisma.disqualification.findFirst({ where: scope });
    if (!existing) {
      const e = new Error('Disqualification not found');
      e.status = 404;
      throw e;
    }
    return prisma.disqualification.update({
      where: { id },
      data,
      include: { employee: true },
    });
  },

  async remove(req, id) {
    const scope = withTenant(req, { id });
    const existing = await prisma.disqualification.findFirst({ where: scope });
    if (!existing) {
      const e = new Error('Disqualification not found');
      e.status = 404;
      throw e;
    }
    return prisma.disqualification.delete({ where: { id } });
  },

  async findReport(req, { dateFrom, dateTo, type, reason, isBarred } = {}) {
    const where = withTenant(req, {});

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) where.date.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (isBarred !== undefined) where.isBarred = isBarred;

    return prisma.disqualification.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            employeeNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  },

  async findActive(req) {
    const now = new Date();
    const scope = withTenant(req, {});
    scope.OR = [
      { validity: null },
      { validity: { gt: now } },
    ];

    return prisma.disqualification.findMany({
      where: scope,
      include: { employee: true },
    });
  },
};
