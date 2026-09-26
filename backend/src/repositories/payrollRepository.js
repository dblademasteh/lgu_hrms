import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const payrollRepository = {
  async findRuns(req, { page = 1, limit = 20, summary = false } = {}) {
    const where = withTenant(req);
    const [total, items] = await Promise.all([
      prisma.payrollRun.count({ where }),
      prisma.payrollRun.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: summary
          ? { period: true, _count: { select: { items: true } } }
          : { period: true, items: { include: { employee: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { items, total, page, limit };
  },
  async findAllPeriods(req) {
    const where = withTenant(req);
    return prisma.payrollPeriod.findMany({ where, orderBy: { startDate: 'desc' } });
  },
  async findRunById(req, id) {
    const where = withTenant(req, { id });
    return prisma.payrollRun.findFirst({
      where,
      include: { period: true, items: { include: { deductionLines: true } }, ledgerEntries: true },
    });
  },
  async findPeriodByName(req, name) {
    return prisma.payrollPeriod.findFirst({ where: withTenant(req, { name }) });
  },

  async findPeriodByExternalId(req, externalId) {
    return prisma.payrollPeriod.findFirst({ where: withTenant(req, { externalId }) });
  },

  async findRunByExternalId(req, externalId) {
    return prisma.payrollRun.findFirst({ where: withTenant(req, { externalId }) });
  },

  async findItemByExternalId(req, externalId) {
    return prisma.payrollItem.findFirst({ where: withTenant(req, { externalId }), include: { payslip: true } });
  },

  async findPayslipByExternalId(req, externalId) {
    return prisma.payrollItem.findFirst({
      where: withTenant(req, { externalId }),
      include: { payslip: true },
    });
  },

  async createPeriodExternal(req, data) {
    return prisma.payrollPeriod.create({ data: stampTenant(req, { ...data, source: 'LGU_PAYROLL' }) });
  },

  async updatePeriodExternal(req, id, data) {
    return prisma.payrollPeriod.update({ where: withTenant(req, { id }), data: { ...data, source: 'LGU_PAYROLL' } });
  },

  async createRunExternal(req, data) {
    return prisma.payrollRun.create({ data: stampTenant(req, { ...data, source: 'LGU_PAYROLL' }) });
  },

  async updateRunExternal(req, id, data) {
    return prisma.payrollRun.update({ where: withTenant(req, { id }), data: { ...data, source: 'LGU_PAYROLL' } });
  },

  async createItemExternal(req, data) {
    return prisma.payrollItem.create({ data: stampTenant(req, { ...data, source: 'LGU_PAYROLL' }) });
  },

  async updateItemExternal(req, id, data) {
    return prisma.payrollItem.update({ where: withTenant(req, { id }), data: { ...data, source: 'LGU_PAYROLL' } });
  },

  async createDeductionLinesExternal(req, lines) {
    return prisma.payrollDeductionLine.createMany({ data: lines.map(l => stampTenant(req, l)) });
  },

  async createPayslipExternal(req, data) {
    return prisma.payslip.create({ data: stampTenant(req, data) });
  },

  async updatePayslipExternal(req, id, data) {
    return prisma.payslip.update({ where: withTenant(req, { id }), data });
  },
};
