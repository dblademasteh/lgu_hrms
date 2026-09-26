import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const leaveRepository = {
  async findAllRequests(req) {
    const where = withTenant(req);
    const deptScope = (await import('../middleware/departmentScope.js')).getDepartmentScope(req);
    if (deptScope) where.employee = { departmentId: deptScope };
    return prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },
  async createRequest(req, data) {
    return prisma.leaveRequest.create({ data: stampTenant(req, data) });
  },
  async findRequestsByEmployee(req, employeeId) {
    return prisma.leaveRequest.findMany({
      where: withTenant(req, { employeeId }),
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },
  async findRequest(req, id) {
    return prisma.leaveRequest.findFirst({
      where: { ...withTenant(req), id },
      include: { employee: { select: { departmentId: true } } },
    });
  },
  async findCredits(req, employeeId) {
    const where = withTenant(req, { employeeId });
    return prisma.leaveCredit.findMany({ where, orderBy: { type: 'asc' } });
  },
  async findOverlapping(req, employeeId, fromDate, toDate, excludeId) {
    const where = {
      ...withTenant(req),
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { fromDate: { lte: toDate }, toDate: { gte: fromDate } },
      ],
    };
    if (excludeId) where.id = { not: excludeId };
    return prisma.leaveRequest.findFirst({ where });
  },
  async findLeaveCredit(req, employeeId, type, year) {
    const where = withTenant(req, { employeeId, type, year });
    return prisma.leaveCredit.findFirst({ where });
  },
  async createLeaveCredit(req, employeeId, type, year, balance) {
    try {
      return await prisma.leaveCredit.create({
        data: { employeeId, type, year, balance, ...stampTenant(req, {}) },
      });
    } catch (e) {
      if (e?.code === 'P2002') {
        return prisma.leaveCredit.findFirst({
          where: { ...withTenant(req), employeeId, type, year },
        });
      }
      throw e;
    }
  },
  async updateRequestStatus(req, id, data) {
    return prisma.leaveRequest.update({ where: withTenant(req, { id }), data });
  },
  async findLeaveRuleConfigs(req) {
    const where = withTenant(req);
    return prisma.leaveRuleConfig.findMany({ where, orderBy: { effectiveFrom: 'asc' } });
  },

  async findIntegrationRequests(req, { startDate, endDate, employeeNumber, status, type, page = 1, limit = 50 }) {
    const where = withTenant(req);
    // Date filters match requests that overlap the window: toDate >= start
    // and fromDate <= end. Each bound applies only when supplied.
    if (startDate) where.toDate = { gte: new Date(`${startDate}T00:00:00Z`) };
    if (endDate) where.fromDate = { lte: new Date(`${endDate}T23:59:59Z`) };
    if (status) where.status = status;
    if (type) where.type = type;
    if (employeeNumber) where.employee = { employeeNumber };

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ fromDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              middleName: true,
              department: { select: { id: true, name: true, code: true } },
              position: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async findIntegrationCredits(req, { employeeNumber, year, page = 1, limit = 100 }) {
    const where = withTenant(req);
    if (year) where.year = year;
    if (employeeNumber) where.employee = { employeeNumber };

    const [items, total] = await Promise.all([
      prisma.leaveCredit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { type: 'asc' }],
        include: {
          employee: {
            select: { id: true, employeeNumber: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.leaveCredit.count({ where }),
    ]);

    return { items, total, page, limit };
  },
  async updateLeaveCredit(req, employeeId, type, year, delta) {
    const credit = await prisma.leaveCredit.findFirst({
      where: { ...withTenant(req), employeeId, type, year },
    });
    if (!credit) return null;
    return prisma.leaveCredit.update({
      where: { id: credit.id },
      data: { balance: { decrement: Math.abs(delta) } },
    });
  },
};
