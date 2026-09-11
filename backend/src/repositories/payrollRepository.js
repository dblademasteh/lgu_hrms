import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const payrollRepository = {
  async findAllRuns(req) {
    const where = withTenant(req);
    return prisma.payrollRun.findMany({
      where,
      include: { period: true, items: true, ledgerEntries: true },
      orderBy: { createdAt: 'desc' }
    });
  },
  async findAllPeriods(req) {
    const where = withTenant(req);
    return prisma.payrollPeriod.findMany({ where, orderBy: { startDate: 'desc' } });
  },
  async findRunById(req, id) {
    const where = withTenant(req, { id });
    return prisma.payrollRun.findFirst({
      where,
      include: { period: true, items: true, ledgerEntries: true },
    });
  },
  async createRun(req, data) {
    const stamped = stampTenant(req, data);
    return prisma.payrollRun.create({ data: stamped });
  },
  async updateRunStatus(req, id, status) {
    const scope = withTenant(req, { id });
    const existing = await prisma.payrollRun.findFirst({ where: scope });
    if (!existing) {
      const e = new Error('Payroll run not found');
      e.status = 404;
      throw e;
    }
    return prisma.payrollRun.update({ where: { id }, data: { status } });
  }
};