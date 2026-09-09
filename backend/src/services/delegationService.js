import { prisma } from '../lib/prisma.js';

export const delegationService = {
  async listForUser(userId) {
    return prisma.delegation.findMany({
      where: { OR: [{ delegatorId: userId }, { delegateeId: userId }] },
      orderBy: { createdAt: 'desc' }
    });
  },
  async create(userId, data) {
    return prisma.delegation.create({
      data: { ...data, delegatorId: userId }
    });
  },
  async revoke(id, userId) {
    return prisma.delegation.update({
      where: { id },
      data: { endsAt: new Date() }
    });
  }
};
