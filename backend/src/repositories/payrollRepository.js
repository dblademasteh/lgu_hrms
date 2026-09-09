import { prisma } from '../lib/prisma.js';

export const payrollRepository = {
  async findAllRuns() {
    return prisma.payrollRun.findMany({
      include: { period: true, items: true, ledgerEntries: true },
      orderBy: { createdAt: 'desc' }
    });
  },
  async createRun(data) {
    return prisma.payrollRun.create({ data });
  }
};