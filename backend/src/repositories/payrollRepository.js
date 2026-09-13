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
  },
  async findPeriodById(req, id) {
    return prisma.payrollPeriod.findFirst({ where: withTenant(req, { id }) });
  },
  async createPeriod(req, data) {
    return prisma.payrollPeriod.create({ data: stampTenant(req, data) });
  },
  async findPeriodByName(req, name) {
    return prisma.payrollPeriod.findFirst({ where: withTenant(req, { name }) });
  },
  async closePeriod(req, id) {
    const existing = await prisma.payrollPeriod.findFirst({ where: withTenant(req, { id }) });
    if (!existing) {
      const e = new Error('Payroll period not found');
      e.status = 404;
      throw e;
    }
    return prisma.payrollPeriod.update({ where: { id }, data: { status: 'CLOSED' } });
  },
  async findRunByPeriod(req, periodId) {
    return prisma.payrollRun.findFirst({ where: withTenant(req, { periodId }) });
  },
  /** Regenerate contents of a DRAFT run (idempotent: wipes prior items/lines/payslips). */
  async regenerateRun(req, run, built) {
    const tenantId = req.tenantId ?? null;
    return prisma.$transaction(async tx => {
      if (built.itemIds.length > 0) {
        await tx.payrollDeductionLine.deleteMany({ where: { tenantId, payrollItemId: { in: built.itemIds } } });
        await tx.payslip.deleteMany({ where: { tenantId, payrollItemId: { in: built.itemIds } } });
        await tx.payrollItem.deleteMany({ where: { tenantId, runId: run.id } });
      }
      const created = await tx.payrollItem.createManyAndReturn({
        data: built.rows.map(i => ({
          tenantId, runId: run.id, employeeId: i.employeeId,
          basicPay: i.basicPay, allowances: i.allowances,
          deductions: i.deductions, netPay: i.netPay,
        })),
        select: { id: true, employeeId: true },
      });
      const itemIdByEmployee = new Map(created.map(c => [c.employeeId, c.id]));
      await tx.payrollDeductionLine.createMany({
        data: built.rows.flatMap(i =>
          i.lines.map(l => ({
            tenantId, payrollItemId: itemIdByEmployee.get(i.employeeId), code: l.code,
            description: l.description, employeeShare: l.employeeShare, employerShare: l.employerShare,
          }))
        ),
      });
      const reloaded = await tx.payrollRun.findFirst({
        where: { id: run.id, tenantId },
        include: { period: true, items: { include: { employee: true, deductionLines: true } }, ledgerEntries: true },
      });
      return reloaded;
    });
  },
  /** Post an APPROVED run: ledger entries, payslip rows, mark loans paid, status→POSTED. */
  async postRun(req, run, posting) {
    const tenantId = req.tenantId ?? null;
    return prisma.$transaction(async tx => {
      await tx.ledgerEntry.createMany({ data: posting.ledger });
      await tx.payslip.createMany({
        data: posting.itemIds.map(id => ({ tenantId, payrollItemId: id })),
      });
      if (posting.amortizationIds.length > 0) {
        await tx.loanAmortization.updateMany({
          where: { id: { in: posting.amortizationIds }, tenantId },
          data: { paid: true },
        });
      }
      await tx.payrollRun.update({ where: { id: run.id }, data: { status: 'POSTED', postedAt: new Date() } });
      return tx.payrollRun.findFirst({
        where: { id: run.id, tenantId },
        include: { period: true, items: { include: { employee: true, deductionLines: true } }, ledgerEntries: true },
      });
    });
  },
  async findPayrollItemForPrint(req, itemId) {
    return prisma.payrollItem.findFirst({
      where: withTenant(req, { id: itemId }),
      include: {
        employee: { include: { position: true, department: true } },
        run: { include: { period: true } },
        deductionLines: true,
      },
    });
  },
};
