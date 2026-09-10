import { prisma } from '../lib/prisma.js';

export const reportsController = {
  /**
   * COA-style payroll summary: per-run totals aggregated from PayrollItems.
   * ?runId=... for one run, ?periodId=... for all runs in a period,
   * otherwise the latest run.
   */
  async payrollSummary(req, res, next) {
    try {
      const { runId, periodId } = req.query;
      let run;
      if (runId) {
        run = await prisma.payrollRun.findUnique({
          where: { id: runId },
          include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      } else if (periodId) {
        run = await prisma.payrollRun.findFirst({
          where: { periodId },
          orderBy: { runDate: 'desc' },
          include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No runs for this period' } });
      } else {
        run = await prisma.payrollRun.findFirst({
          orderBy: { runDate: 'desc' },
          include: { period: true },
        });
        if (!run) return res.json({ report: 'payroll-summary', generatedAt: new Date().toISOString(), data: null });
      }

      const agg = await prisma.payrollItem.aggregate({
        where: { runId: run.id },
        _count: true,
        _sum: { basicPay: true, allowances: true, deductions: true, netPay: true },
      });

      res.json({
        report: 'payroll-summary',
        generatedAt: new Date().toISOString(),
        data: {
          runId: run.id,
          runDate: run.runDate,
          status: run.status,
          period: run.period ? { id: run.period.id, name: run.period.name } : null,
          headcount: agg._count,
          totalBasicPay: agg._sum.basicPay,
          totalAllowances: agg._sum.allowances,
          totalDeductions: agg._sum.deductions,
          totalNetPay: agg._sum.netPay,
        },
      });
    } catch (e) {
      next(e);
    }
  },
};