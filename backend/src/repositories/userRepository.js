import { prisma } from '../lib/prisma.js';

export const userRepository = {
  async findById(id) {
    return prisma.user.findUnique({ where: { id }, include: { department: true } });
  },
  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
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
  }
};
