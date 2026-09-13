import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const ZERO = new Prisma.Decimal(0);
const WORK_START = 8 * 60 + 0; // 08:00 Asia/Manila
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function manilaMinutes(dt) {
  const shifted = new Date(dt.getTime() + MANILA_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

function round2(d) {
  return d.toDecimalPlaces(2);
}

/** Taxes and contributions tables must be normalized before computeRun. */
async function loadRules(tenantId, start, end) {
  const inEffect = {
    effectiveFrom: { lte: end },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
  };
  const [contributions, taxBrackets, attendanceRules] = await Promise.all([
    prisma.contributionRule.findMany({ where: { tenantId, ...inEffect }, orderBy: { type: 'asc' } }),
    prisma.taxBracket.findMany({ where: { tenantId, ...inEffect }, orderBy: { minIncome: 'asc' } }),
    prisma.attendanceRule.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } }),
  ]);
  return { contributions, taxBrackets, attendanceRules };
}

/**
 * Build one PayrollItem per ACTIVE salaried employee for a DRAFT run.
 *
 * Money is computed exclusively with Prisma Decimal — no JS floats.
 * Rate semantics: ContributionRule.employeeRate / employerRate and
 * TaxBracket.rate are stored as DECIMAL FRACTIONS (0.045 == 4.5%).
 *
 * Deduction lines generated:
 *  - CON-<type>   statutory contribution (employee/employer share)
 *  - TAX          simplified bracketed withholding = (taxable - minIncome) * rate
 *  - LOAN-<id>    unpaid LoanAmortization whose dueDate falls in the period
 *  - ATTD-<name>  per-day tardiness penalty when timeIn is past the rule grace
 */
export async function computeRun(req, period) {
  const tenantId = req.tenantId ?? null;
  const start = period.startDate;
  const end = period.endDate;

  const employees = await prisma.employee.findMany({
    where: { tenantId, status: 'ACTIVE', deletedAt: null, monthlySalary: { gt: '0' } },
    include: { position: true },
    orderBy: { employeeNumber: 'asc' },
  });
  if (employees.length === 0) {
    return { rows: [], itemIds: [], amortizationIds: [] };
  }

  const { contributions, taxBrackets, attendanceRules } = await loadRules(tenantId, start, end);

  const dueLoans = await prisma.loanAmortization.findMany({
    where: { tenantId, paid: false, dueDate: { gte: start, lte: end } },
    include: { loan: { include: { employee: { select: { id: true } } } } },
  });
  const amortizationsByEmployee = new Map();
  for (const am of dueLoans) {
    const eid = am.loan?.employee?.id;
    if (!eid) continue;
    if (!amortizationsByEmployee.has(eid)) amortizationsByEmployee.set(eid, []);
    amortizationsByEmployee.get(eid).push(am);
  }

  const attendances = await prisma.attendance.findMany({
    where: { tenantId, date: { gte: start, lte: end } },
    select: { employeeId: true, timeIn: true },
  });
  const lateDaysByEmployee = new Map();
  for (const a of attendances) {
    if (!a.timeIn) continue;
    const lateMins = manilaMinutes(a.timeIn) - WORK_START;
    if (lateMins > (attendanceRules[0]?.tardinessMin ?? 0)) {
      lateDaysByEmployee.set(a.employeeId, (lateDaysByEmployee.get(a.employeeId) ?? 0) + 1);
    }
  }

  const rows = [];
  const amortizationIds = [];

  for (const emp of employees) {
    const basic = new Prisma.Decimal(emp.monthlySalary);
    const lines = [];
    let contribTotal = ZERO;
    let tardinessTotal = ZERO;

    for (const c of contributions) {
      const employeeShare = round2(basic.mul(c.employeeRate));
      const employerShare = round2(basic.mul(c.employerRate));
      contribTotal = contribTotal.add(employeeShare);
      lines.push({ code: `CON-${c.type}`, description: `${c.type} contribution`, employeeShare, employerShare });
    }

    const ams = amortizationsByEmployee.get(emp.id) ?? [];
    let loanTotal = ZERO;
    for (const am of ams) {
      loanTotal = loanTotal.add(new Prisma.Decimal(am.amount));
      amortizationIds.push(am.id);
      const loanRef = (am.loan?.id ?? 'AMORT').replace(/^loan-/i, '').slice(0, 8).toUpperCase();
      const code = `LOAN-${loanRef}`;
      lines.push({
        code,
        description: `Loan amortization due ${am.dueDate.toISOString().slice(0, 10)}`,
        employeeShare: new Prisma.Decimal(am.amount),
        employerShare: ZERO,
      });
    }

    if (attendanceRules.length > 0 && lateDaysByEmployee.has(emp.id)) {
      const rule = attendanceRules[0];
      const days = lateDaysByEmployee.get(emp.id) ?? 0;
      const total = round2(new Prisma.Decimal(rule.deductionRate).mul(days));
      tardinessTotal = total;
      lines.push({
        code: `ATTD-${rule.name.toUpperCase().replace(/\s+/g, '')}`,
        description: `Tardiness ${days} day(s) (${rule.tardinessMin}min grace)`,
        employeeShare: total,
        employerShare: ZERO,
      });
    }

    let tax = ZERO;
    if (taxBrackets.length > 0) {
      const taxable = basic.sub(contribTotal);
      const bracket = taxBrackets.find(b => {
        const min = new Prisma.Decimal(b.minIncome);
        const max = b.maxIncome ? new Prisma.Decimal(b.maxIncome) : null;
        const geMin = taxable.gte(min);
        if (max === null) return geMin;
        if (taxable.lte(max)) return geMin;
        return false;
      });
      if (bracket) {
        const excess = taxable.sub(new Prisma.Decimal(bracket.minIncome));
        if (excess.greaterThan(ZERO)) {
          tax = round2(excess.mul(bracket.rate));
          lines.push({ code: 'TAX', description: 'Withholding tax (simplified bracket)', employeeShare: tax, employerShare: ZERO });
        }
      }
    }

    const deductions = contribTotal.add(tardinessTotal).add(loanTotal);
    const totalDeductions = deductions.add(tax);
    const net = round2(basic.sub(totalDeductions));

    rows.push({
      employeeId: emp.id,
      basicPay: round2(basic),
      allowances: ZERO,
      deductions: round2(totalDeductions),
      netPay: net,
      lines,
    });
  }

  return { rows, itemIds: [], amortizationIds: [...new Set(amortizationIds)] };
}
