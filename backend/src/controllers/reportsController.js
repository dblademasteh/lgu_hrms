import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

function csvEscape(v) {
  const s = String(v ?? '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

function csvRow(fields) {
  return fields.map(csvEscape).join(',');
}

function csvDownload(res, filename, header, rows) {
  const lines = [csvRow(header), ...rows.map((r) => csvRow(r))];
  // UTF-8 BOM so Excel opens multibyte chars (Philippine names) correctly.
  const csv = '\uFEFF' + lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

export const reportsController = {
  /**
   * COA-style payroll summary: per-run totals aggregated from PayrollItems.
   * ?runId=... for one run, ?periodId=... for the latest POSTED run in a period,
   * otherwise the latest POSTED run.
   */
  async payrollSummary(req, res, next) {
    try {
      const { runId, periodId } = req.query;
      let run;
      if (runId) {
        run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { id: runId }),
          include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      } else if (periodId) {
        run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { periodId, status: 'POSTED' }),
          orderBy: { runDate: 'desc' },
          include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No posted runs for this period' } });
      } else {
        run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { status: 'POSTED' }),
          orderBy: { runDate: 'desc' },
          include: { period: true },
        });
        if (!run) return res.json({ report: 'payroll-summary', generatedAt: new Date().toISOString(), data: null });
      }

      const agg = await prisma.payrollItem.aggregate({
        where: withTenant(req, { runId: run.id }),
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

  /**
   * COA Payroll Register: per-employee breakdown of payroll items with
   * basic pay, allowances, deductions (by code), and net pay.
   * CSV output.  ?runId=<id> targets a specific run; ?periodId=<id> uses
   * the latest POSTED run in that period; default = latest POSTED run.
   */
  async payrollRegister(req, res, next) {
    try {
      const { runId, periodId } = req.query;
      let run;
      if (runId) {
        run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { id: runId }), include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      } else if (periodId) {
        run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { periodId, status: 'POSTED' }),
          orderBy: { runDate: 'desc' }, include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No posted runs for this period' } });
      } else {
        run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { status: 'POSTED' }),
          orderBy: { runDate: 'desc' }, include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No posted payroll runs found' } });
      }

      // Fetch items joined with employee + deduction lines in one go.
      const items = await prisma.payrollItem.findMany({
        where: withTenant(req, { runId: run.id }),
        include: {
          employee: {
            select: {
              employeeNumber: true, lastName: true, firstName: true, middleName: true,
              department: { select: { name: true, code: true } },
              position: { select: { title: true } },
            },
          },
          deductionLines: { select: { code: true, description: true, employeeShare: true } },
        },
        orderBy: { employee: { lastName: 'asc' } },
      });

      // Build deduction columns dynamically from all codes present.
      const dedCodes = Array.from(
        new Set(items.flatMap((it) => it.deductionLines.map((d) => d.code)))
      ).sort();

      const header = [
        'Employee No', 'Last Name', 'First Name', 'Middle Name',
        'Department', 'Position',
        'Basic Pay', 'Allowances',
        ...dedCodes.map((c) => `Deduction: ${c}`),
        'Total Deductions', 'Net Pay',
      ];

      const rows = items.map((it) => {
        const emp = it.employee || {};
        const dedByCode = {};
        for (const d of it.deductionLines) {
          dedByCode[d.code] = Number(d.employeeShare);
        }
        const dedTotal = Number(it.deductions);
        return [
          emp.employeeNumber ?? '',
          emp.lastName ?? '',
          emp.firstName ?? '',
          emp.middleName ?? '',
          emp.department?.name ?? '',
          emp.position?.title ?? '',
          Number(it.basicPay).toFixed(2),
          Number(it.allowances).toFixed(2),
          ...dedCodes.map((c) => (dedByCode[c] ?? 0).toFixed(2)),
          dedTotal.toFixed(2),
          Number(it.netPay).toFixed(2),
        ];
      });

      const periodLabel = run.period?.name ?? `Period ${run.periodId}`;
      csvDownload(res, `payroll-register-${periodLabel}-${String(run.runDate).slice(0, 10)}.csv`, header, rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * Payroll Journal: COA-style debit/credit ledger from LedgerEntry rows
   * for a posted run.
   * CSV output.  ?runId=<id> targets a specific run; ?periodId=<id> lists
   * all posted runs in that period; default = latest POSTED run.
   */
  async payrollJournal(req, res, next) {
    try {
      const { runId, periodId } = req.query;
      const runWhere = runId
        ? withTenant(req, { id: runId })
        : periodId
          ? undefined
          : withTenant(req, { status: 'POSTED' });

      if (runId) {
        const run = await prisma.payrollRun.findFirst({
          where: withTenant(req, { id: runId }), include: { period: true },
        });
        if (!run) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      }

      let runs;
      if (runId) {
        runs = [await prisma.payrollRun.findFirst({
          where: withTenant(req, { id: runId }), include: { period: true },
        })];
      } else if (periodId) {
        runs = await prisma.payrollRun.findMany({
          where: withTenant(req, { periodId, status: 'POSTED' }),
          orderBy: { runDate: 'desc' }, include: { period: true },
        });
        if (runs.length === 0) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No posted runs for this period' } });
        }
      } else {
        const latest = await prisma.payrollRun.findFirst({
          where: withTenant(req, { status: 'POSTED' }),
          orderBy: { runDate: 'desc' },
        });
        runs = latest ? [latest] : [];
        if (runs.length === 0) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No posted payroll runs found' } });
        }
      }

      const runIds = runs.map((r) => r.id);

      const entries = await prisma.ledgerEntry.findMany({
        where: withTenant(req, { runId: { in: runIds } }),
        orderBy: [{ runId: 'asc' }, { createdAt: 'asc' }],
        include: { run: { select: { period: { select: { name: true } }, runDate: true, status: true } } },
      });

      const header = ['Date', 'Period', 'Run Status', 'Ledger Type', 'Amount', 'Running Balance', 'Reference'];
      const rows = entries.map((e) => {
        const d = new Date(e.createdAt);
        return [
          d.toISOString().slice(0, 10),
          e.run?.period?.name ?? '',
          e.run?.status ?? '',
          e.type,
          Number(e.amount).toFixed(2),
          Number(e.balance).toFixed(2),
          e.reference ?? '',
        ];
      });

      csvDownload(res,
        `payroll-journal-${String(runs[0]?.runDate ?? new Date()).slice(0, 10)}.csv`,
        header, rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * Employee Master List: full personnel directory CSV.
   * Optional ?departmentId=<id> filter.
   */
  async employeeMasterList(req, res, next) {
    try {
      const { departmentId } = req.query;
      const where = withTenant(req, { deletedAt: null, ...(departmentId && { departmentId }) });

      const employees = await prisma.employee.findMany({
        where,
        orderBy: { lastName: 'asc' },
        select: {
          employeeNumber: true, lastName: true, firstName: true, middleName: true,
          birthDate: true, gender: true, civilStatus: true, address: true,
          contactNumber: true, email: true, status: true, monthlySalary: true,
          keyPosition: true, sssNumber: true, philhealthNumber: true,
          pagibigNumber: true, tinNumber: true, bankAccount: true, bankName: true,
          hiredDate: true, createdAt: true,
          department: { select: { name: true, code: true } },
          position: { select: { title: true } },
        },
      });

      const header = [
        'Employee No', 'Last Name', 'First Name', 'Middle Name',
        'Department', 'Position Title', 'Status', 'Date Hired',
        'SSS No', 'PHIC No', 'Pag-IBIG No', 'TIN',
        'Bank', 'Account No', 'Monthly Salary', 'Key Position',
      ];

      const rows = employees.map((e) => [
        e.employeeNumber,
        e.lastName,
        e.firstName,
        e.middleName ?? '',
        e.department?.name ?? '',
        e.position?.title ?? '',
        e.status,
        e.hiredDate ? new Date(e.hiredDate).toISOString().slice(0, 10) : '',
        e.sssNumber ?? '',
        e.philhealthNumber ?? '',
        e.pagibigNumber ?? '',
        e.tinNumber ?? '',
        e.bankName ?? '',
        e.bankAccount ?? '',
        Number(e.monthlySalary).toFixed(2),
        e.keyPosition ?? '',
      ]);

      csvDownload(res, `employee-master-list-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
    } catch (e) {
      next(e);
    }
  },
};