import { payrollService } from '../services/payrollService.js';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/rbac.js';
import { withTenant } from '../middleware/tenant.js';

export const payrollController = {
  async listRuns(req, res, next) {
    try {
      res.json(await payrollService.listRuns(req));
    } catch (e) {
      next(e);
    }
  },
  async listPeriods(req, res, next) {
    try {
      res.json(await payrollService.listPeriods(req));
    } catch (e) {
      next(e);
    }
  },
  async getRun(req, res, next) {
    try {
      const run = await payrollService.getRun(req, req.params.id);
      if (!run) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      }
      res.json(run);
    } catch (e) {
      next(e);
    }
  },
  // Payroll writes and payroll artifacts are owned by lgu-payroll.
  // See routes/payroll.js and services/payrollService.js.

  // Integration-facing: list payroll runs (read-only, API-key auth).
  async integrationListRuns(req, res, next) {
    try {
      const q = req.query ?? {};
      const data = await payrollService.listRuns(req);
      res.json({
        items: data.items.map(r => ({
          id: r.id,
          periodId: r.periodId,
          periodName: r.period?.name ?? null,
          runDate: r.runDate?.toISOString().slice(0, 10) ?? null,
          status: r.status,
          createdAt: r.createdAt?.toISOString() ?? null,
          itemCount: r.items?.length ?? 0,
          totalNetPay: r.items?.reduce((sum, i) => sum + Number(i.netPay || 0), 0) ?? 0,
        })),
        total: data.total,
        page: data.page,
        limit: data.limit,
      });
    } catch (e) {
      next(e);
    }
  },

  // Integration-facing: get a single payroll run with items and deduction lines.
  async integrationGetRun(req, res, next) {
    try {
      const run = await payrollService.getRun(req, req.params.id);
      if (!run) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      }
      res.json({
        id: run.id,
        periodId: run.periodId,
        periodName: run.period?.name ?? null,
        runDate: run.runDate?.toISOString().slice(0, 10) ?? null,
        status: run.status,
        createdAt: run.createdAt?.toISOString() ?? null,
        items: (run.items ?? []).map(i => ({
          id: i.id,
          employeeId: i.employeeId,
          employeeNumber: i.employee?.employeeNumber ?? null,
          employeeName: i.employee ? `${i.employee.firstName} ${i.employee.lastName}`.trim() : null,
          department: i.employee?.department?.name ?? null,
          position: i.employee?.position?.title ?? null,
          basicPay: i.basicPay ? Number(i.basicPay) : 0,
          allowances: i.allowances ? Number(i.allowances) : 0,
          deductions: i.deductions ? Number(i.deductions) : 0,
          netPay: i.netPay ? Number(i.netPay) : 0,
          deductionLines: (i.deductionLines ?? []).map(d => ({
            id: d.id,
            code: d.code,
            description: d.description,
            employeeShare: d.employeeShare ? Number(d.employeeShare) : 0,
            quantity: d.quantity ?? null,
          })),
        })),
      });
    } catch (e) {
      next(e);
    }
  },

  // Integration-facing: list payroll periods (read-only, API-key auth).
  async integrationListPeriods(req, res, next) {
    try {
      const data = await payrollService.listPeriods(req);
      const items = (data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: p.endDate?.toISOString().slice(0, 10) ?? null,
        fiscalYear: p.fiscalYear,
        status: p.status,
        closedAt: p.closedAt?.toISOString() ?? null,
      }));
      res.json({ items, total: items.length });
    } catch (e) {
      next(e);
    }
  },

  // Integration-facing: list payslips for a run or employee.
  async integrationListPayslips(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const q = req.query ?? {};
      const page = Math.max(1, parseInt(q.page));
      const limit = Math.min(parseInt(q.limit), 500);
      const skip = (page - 1) * limit;

      const where = { tenantId };
      if (q.runId) where.runId = q.runId;
      if (q.employeeNumber) {
        const employee = await prisma.employee.findFirst({
          where: { tenantId, employeeNumber: q.employeeNumber },
          select: { id: true },
        });
        if (!employee) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
        }
        where.employeeId = employee.id;
      }

      const [items, total] = await Promise.all([
        prisma.payrollItem.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                employeeNumber: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
                position: { select: { title: true } },
              },
            },
            run: {
              select: {
                id: true,
                runDate: true,
                status: true,
                period: { select: { name: true, startDate: true, endDate: true } },
              },
            },
          },
        }),
        prisma.payrollItem.count({ where }),
      ]);

      res.json({
        items: items.map(i => ({
          id: i.id,
          runId: i.runId,
          periodName: i.run?.period?.name ?? null,
          runDate: i.run?.runDate?.toISOString().slice(0, 10) ?? null,
          runStatus: i.run?.status ?? null,
          employeeNumber: i.employee?.employeeNumber ?? null,
          employeeName: i.employee ? `${i.employee.firstName} ${i.employee.lastName}`.trim() : null,
          department: i.employee?.department?.name ?? null,
          position: i.employee?.position?.title ?? null,
          basicPay: i.basicPay ? Number(i.basicPay) : 0,
          allowances: i.allowances ? Number(i.allowances) : 0,
          deductions: i.deductions ? Number(i.deductions) : 0,
          netPay: i.netPay ? Number(i.netPay) : 0,
          createdAt: i.createdAt?.toISOString() ?? null,
        })),
      total,
      page,
      limit,
    });
  } catch (e) {
    next(e);
  }
  },

  // Integration-facing: list loans with amortization schedules so lgu-payroll
  // can amortize salary deductions. Read-only, API-key auth, loans:read scope.
  async integrationListLoans(req, res, next) {
    try {
      const q = req.query ?? {};
      const page = q.page;
      const limit = q.limit;
      const where = withTenant(req, {});
      if (q.status) where.status = q.status;
      if (q.employeeNumber) {
        const employee = await prisma.employee.findFirst({
          where: withTenant(req, { employeeNumber: q.employeeNumber }),
          select: { id: true },
        });
        if (!employee) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
        }
        where.employeeId = employee.id;
      }

      const [items, total] = await Promise.all([
        prisma.loan.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: { employeeNumber: true, firstName: true, lastName: true },
            },
            amortizations: { orderBy: { dueDate: 'asc' } },
          },
        }),
        prisma.loan.count({ where }),
      ]);

      res.json({
        items: items.map((l) => {
          const amortizations = (l.amortizations ?? []).map((a) => ({
            id: a.id,
            dueDate: a.dueDate?.toISOString().slice(0, 10) ?? null,
            amount: a.amount ? Number(a.amount) : 0,
            paid: a.paid,
          }));
          return {
            id: l.id,
            employeeNumber: l.employee?.employeeNumber ?? null,
            employeeName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}`.trim() : null,
            type: l.type,
            amount: l.amount ? Number(l.amount) : 0,
            termMonths: l.termMonths,
            startDate: l.startDate?.toISOString().slice(0, 10) ?? null,
            status: l.status,
            outstandingBalance: amortizations.filter((a) => !a.paid).reduce((s, a) => s + a.amount, 0),
            amortizations,
          };
        }),
        total,
        page,
        limit,
      });
    } catch (e) {
      next(e);
    }
  },

  async syncFromPayroll(req, res, next) {
    try {
      const { payrollAdapter } = await import('../services/payrollAdapter.js');
      const result = await payrollAdapter.sync(req, req.body.since);
      res.json({ ok: true, ...result });
    } catch (e) {
      next(e);
    }
  },
};