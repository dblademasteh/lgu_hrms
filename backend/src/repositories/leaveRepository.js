import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const leaveRepository = {
  async findAllRequests(req) {
    const where = withTenant(req);
    return prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },
  async createRequest(req, data) {
    const stamped = stampTenant(req, data);
    return prisma.leaveRequest.create({ data: stamped });
  },
  async updateRequest(req, id, data) {
    const scope = withTenant(req, { id });
    const existing = await prisma.leaveRequest.findFirst({ where: scope });
    if (!existing) {
      const e = new Error('Leave request not found');
      e.status = 404;
      throw e;
    }
    const stamped = stampTenant(req, data);
    return prisma.leaveRequest.update({ where: { id }, data: stamped });
  },
  async findCredits(req, employeeId) {
    const where = withTenant(req, { employeeId });
    return prisma.leaveCredit.findMany({ where });
  }
};