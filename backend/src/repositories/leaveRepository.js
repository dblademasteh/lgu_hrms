import { prisma } from '../lib/prisma.js';

export const leaveRepository = {
  async findAllRequests() {
    return prisma.leaveRequest.findMany({
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },
  async createRequest(data) {
    return prisma.leaveRequest.create({ data });
  },
  async updateRequest(id, data) {
    return prisma.leaveRequest.update({ where: { id }, data });
  },
  async findCredits(employeeId) {
    return prisma.leaveCredit.findMany({ where: { employeeId } });
  }
};