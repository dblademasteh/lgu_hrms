import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

export const reportsService = {
  async payrollRegister(req, runId) {
    const run = await prisma.payrollRun.findFirst({
      where: withTenant(req, { id: runId, status: 'POSTED' }),
      include: { period: true },
    });
    if (!run) throw Object.assign(new Error('Run not found'), { status: 404, code: 'NOT_FOUND' });

    const items = await prisma.payrollItem.findMany({
      where: withTenant(req, { runId }),
      include: {
        employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, middleName: true } },
        deductionLines: true,
      },
      orderBy: { employee: { lastName: 'asc' } },
    });

    const rows = items.map(it => ({
      employeeNumber: it.employee.employeeNumber,
      employeeName: `${it.employee.lastName}, ${it.employee.firstName} ${it.employee.middleName ?? ''}`.trim(),
      basicPay: it.basicPay,
      allowances: it.allowances,
      deductions: it.deductions,
      netPay: it.netPay,
      deductionBreakdown: it.deductionLines.map(dl => ({ code: dl.code, amount: dl.amount })).join(';'),
      period: run.period?.name,
      runDate: run.runDate,
      status: run.status,
    }));

    return { run, rows };
  },

  async payrollSummary(req, runId) {
    const run = await prisma.payrollRun.findFirst({
      where: withTenant(req, { id: runId }),
      include: { period: true },
    });
    if (!run) throw Object.assign(new Error('Run not found'), { status: 404, code: 'NOT_FOUND' });
    const agg = await prisma.payrollItem.aggregate({
      where: withTenant(req, { runId }),
      _count: true,
      _sum: { basicPay: true, allowances: true, deductions: true, netPay: true },
    });
    return { run, agg };
  },

  async payrollJournal(req, runId) {
    const run = await prisma.payrollRun.findFirst({
      where: withTenant(req, { id: runId, status: 'POSTED' }),
      include: { period: true },
    });
    if (!run) throw Object.assign(new Error('Run not found'), { status: 404, code: 'NOT_FOUND' });

    const entries = await prisma.ledgerEntry.findMany({
      where: withTenant(req, { payrollRunId: runId }),
      orderBy: { createdAt: 'asc' },
    });

    return { run, entries };
  },

  async employeeMasterList(req) {
    const employees = await prisma.employee.findMany({
      where: withTenant(req),
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        suffix: true,
        email: true,
        phone: true,
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, title: true } },
        employmentStatus: true,
        hireDate: true,
        monthlySalary: true,
        isActive: true,
      },
      orderBy: { lastName: 'asc' },
    });
    return { employees };
  },

  async serviceRecord(req, employeeId) {
    const employee = await prisma.employee.findFirst({
      where: withTenant(req, { id: employeeId }),
      include: {
        department: true,
        position: true,
        appointments: { orderBy: { startDate: 'asc' }, include: { plantilla: true } },
      },
    });
    if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404, code: 'NOT_FOUND' });
    return { employee };
  },
};
