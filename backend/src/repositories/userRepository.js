import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const userRepository = {
  async findAll(req) {
    return prisma.user.findMany({
      where: withTenant(req),
      include: {
        department: true,
        linkedEmployee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  async findById(req, id) {
    return prisma.user.findFirst({ where: withTenant(req, { id }), include: { department: true } });
  },
  async create(req, data) {
    const stamped = stampTenant(req, data);
    return prisma.user.create({ data: stamped });
  },
  async update(req, id, data) {
    const stamped = stampTenant(req, data);
    return prisma.user.update({ where: { id }, data: stamped });
  },
  async delete(req, id) {
    const exists = await prisma.user.findFirst({ where: withTenant(req, { id }) });
    if (!exists) return null;
    return prisma.user.delete({ where: { id } });
  },
  async getSessions(userId) {
    return prisma.userSession.findMany({ where: { userId, revokedAt: null }, orderBy: { lastActive: 'desc' } });
  },
  async revokeSession(sessionId) {
    return prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  },
  async getLoginEvents(userId, limit = 20) {
    return prisma.loginEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
  },
  async createLoginEvent(data) {
    return prisma.loginEvent.create({ data });
  },
  async getDelegations(userId) {
    return prisma.delegation.findMany({
      where: { OR: [{ delegatorId: userId }, { delegateeId: userId }] },
      include: { delegator: { select: { id: true, username: true, displayName: true } }, delegatee: { select: { id: true, username: true, displayName: true } } },
      orderBy: { startsAt: 'desc' }
    });
  },
  async createDelegation(data) {
    return prisma.delegation.create({ data });
  },
  async deleteDelegation(id, userId) {
    return prisma.delegation.deleteMany({ where: { id, delegatorId: userId } });
  }
};
