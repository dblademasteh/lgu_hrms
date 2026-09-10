import { prisma } from '../lib/prisma.js';

export const payrollRepository = {
  async findAllRuns() {
    return prisma.payrollRun.findMany({
      include: { period: true, items: true, ledgerEntries: true },
      orderBy: { createdAt: 'desc' }
    });
  },
  async findAllPeriods() {
    return prisma.payrollPeriod.findMany({ orderBy: { startDate: 'desc' } });
  },
  async findRunById(id) {
    return prisma.payrollRun.findUnique({
      where: { id },
      include: { period: true, items: true, ledgerEntries: true },
    });
  },
  async createRun(data) {
    return prisma.payrollRun.create({ data });
  },
  async updateRunStatus(id, status) {
    return prisma.payrollRun.update({ where: { id }, data: { status } });
  }
};