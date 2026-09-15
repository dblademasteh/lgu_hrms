import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { manilaMinutes, manilaDateKey } from '../lib/time.js';

const ZERO = new Prisma.Decimal(0);
const WORK_START = 8 * 60; // 08:00 Asia/Manila fallback when no rule is set
const WORKDAYS_PER_MONTH = 22; // CSC MC No. 8 s. 2014 divisor
const HOURS_PER_DAY = 8;
// CSC-DBM JC No. 2 s. 2015: HR = S / (22 × 8); pay = hours × HR × multiplier.
const OT_RATE = { WORKDAY: 1.25, REST_DAY: 1.5, HOLIDAY: 1.5 };

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

/** Inclusive count of Mon–Fri dates between two UTC-midnight dates. */
function workdaysBetween(start, end) {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
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
 *  - ATTD-<name>  tardiness days charged to VACATION credits (employeeShare 0,
 *                 quantity = days; the VL debit is settled at POST). Excess
 *                 tardiness beyond available credits becomes unpaid days.
 *  - LWOP         unpaid days (approved LWOP leave + unexcused workday gaps,
 *                 per CSC MC No. 8 s. 2014) prorated against monthly salary.
 *  - OT-<type>    overtime credit from approved OvertimeRequest rows
 *                 (negative employeeShare = additional pay for the employee).
 */
export async function computeRun(req, period) {
  const tenantId = req.tenantId ?? null;
  const start = period.startDate;
  const end = period.endDate;
  const fiscalYear = period.fiscalYear;

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

  // --- Attendance: tardiness counts + office-open days + per-employee gap scoping.
  const attendances = await prisma.attendance.findMany({
    where: { tenantId, date: { gte: start, lte: end } },
    select: { employeeId: true, date: true, timeIn: true },
  });
  const rule0 = attendanceRules[0];
  const scheduledStart = rule0?.workStartMins ?? WORK_START;
  const graceMins = rule0?.tardinessMin ?? 0;

  const lateDaysByEmployee = new Map();
  const attendanceOnDate = new Map(); // dateKey -> Set(employeeId)
  const hasAttendanceByEmployee = new Set();
  const officeOpenDays = new Set();
  for (const a of attendances) {
    const key = manilaDateKey(a.date);
    officeOpenDays.add(key);
    hasAttendanceByEmployee.add(a.employeeId);
    if (!attendanceOnDate.has(key)) attendanceOnDate.set(key, new Set());
    attendanceOnDate.get(key).add(a.employeeId);
    if (a.timeIn) {
      const lateMins = manilaMinutes(a.timeIn) - scheduledStart;
      if (lateMins > graceMins) {
        lateDaysByEmployee.set(a.employeeId, (lateDaysByEmployee.get(a.employeeId) ?? 0) + 1);
      }
    }
  }

  // --- Approved leave: paid coverage (excludes gaps) + explicit LWOP days.
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: 'APPROVED',
      fromDate: { lte: end },
      toDate: { gte: start },
    },
    select: { employeeId: true, fromDate: true, toDate: true, isLwop: true, days: true },
  });
  const lwopDaysByEmployee = new Map();
  const leaveCoveredDates = new Map(); // employeeId -> Set(dateKey)
  for (const lv of approvedLeaves) {
    const from = new Date(lv.fromDate);
    const to = new Date(lv.toDate);
    const overlapStart = new Date(Math.max(from.getTime(), start.getTime()));
    const overlapEnd = new Date(Math.min(to.getTime(), end.getTime()));
    // Prorate the recorded leave days by the working-day overlap inside period.
    const spanWorkdays = workdaysBetween(from, to);
    const overlapWorkdays = overlapStart <= overlapEnd ? workdaysBetween(overlapStart, overlapEnd) : 0;
    const prorated = spanWorkdays > 0 ? (lv.days * overlapWorkdays) / spanWorkdays : 0;
    if (prorated > 0) {
      const bucket = lwopDaysByEmployee.get(lv.employeeId) ?? 0;
      lwopDaysByEmployee.set(lv.employeeId, lv.isLwop ? bucket + prorated : bucket);
    }
    if (!leaveCoveredDates.has(lv.employeeId)) leaveCoveredDates.set(lv.employeeId, new Set());
    const covered = leaveCoveredDates.get(lv.employeeId);
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) covered.add(manilaDateKey(d));
    }
  }

  // --- Attendance gaps: weekdays with office open but no clock-in and no leave,
  // only for employees who clock in at all in the period (untracked staff spared).
  const gapDaysByEmployee = new Map();
  for (const emp of employees) {
    if (!hasAttendanceByEmployee.has(emp.id)) continue;
    const covered = leaveCoveredDates.get(emp.id) ?? new Set();
    let gaps = 0;
    for (
      let d = new Date(start);
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const key = manilaDateKey(d);
      if (!officeOpenDays.has(key)) continue; // office-wide closure (holiday, etc.)
      const present = attendanceOnDate.get(key);
      if (!present?.has(emp.id) && !covered.has(key)) gaps += 1;
    }
    if (gaps > 0) gapDaysByEmployee.set(emp.id, gaps);
  }

  // --- Overtime credits (approved entries, on-time-only, min 2h enforced at create).
  const otEntries = await prisma.overtimeRequest.findMany({
    where: { tenantId, status: 'APPROVED', date: { gte: start, lte: end } },
    select: { employeeId: true, date: true, hours: true, type: true },
  });
  const otPayByEmployee = new Map();
  const otHoursByEmployee = new Map();
  for (const ot of otEntries) {
    const hours = Number(ot.hours);
    if (hours < 2) continue; // CSC-DBM JC 2 s.2015 minimum
    const emp = employees.find(e => e.id === ot.employeeId);
    if (!emp) continue;
    const key = manilaDateKey(ot.date);
    const present = attendanceOnDate.get(key);
    const punched = present?.has(ot.employeeId);
    if (!punched) continue; // must be on-duty that day
    // On-time only: time-in must land at/before scheduled start of the workday.
    const rowTimes = attendances.filter(a => a.employeeId === ot.employeeId && manilaDateKey(a.date) === key);
    const onTime = rowTimes.some(a => a.timeIn && manilaMinutes(a.timeIn) <= scheduledStart);
    if (!onTime) continue;
    const hr = new Prisma.Decimal(emp.monthlySalary).div(WORKDAYS_PER_MONTH * HOURS_PER_DAY);
    const multiplier = OT_RATE[ot.type] ?? 1.25;
    const pay = round2(hr.mul(hours).mul(multiplier));
    otPayByEmployee.set(ot.employeeId, (otPayByEmployee.get(ot.employeeId) ?? ZERO).add(pay));
    otHoursByEmployee.set(ot.employeeId, (otHoursByEmployee.get(ot.employeeId) ?? 0) + hours);
  }

  // --- VACATION credit balances for the fiscal year (tardiness sink).
  const vlCredits = await prisma.leaveCredit.findMany({
    where: { tenantId, type: 'VACATION', year: fiscalYear, balance: { gt: 0 } },
    select: { employeeId: true, balance: true },
  });
  const vlBalanceByEmployee = new Map();
  for (const vc of vlCredits) {
    vlBalanceByEmployee.set(vc.employeeId, (vlBalanceByEmployee.get(vc.employeeId) ?? 0) + vc.balance);
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

    // Tardiness → vacation leave credits (CSC MC No. 41 s. 1998 §34).
    let lateDays = 0;
    if (lateDaysByEmployee.has(emp.id)) {
      lateDays = lateDaysByEmployee.get(emp.id);
      const vlAvailable = vlBalanceByEmployee.get(emp.id) ?? 0;
      const vlDebit = Math.min(lateDays, Math.floor(vlAvailable));
      if (vlDebit > 0) {
        lines.push({
          code: `ATTD-${rule0?.name?.toUpperCase().replace(/\s+/g, '') || 'RULE'}`,
          description: `Tardiness ${vlDebit} day(s) charged to vacation leave`,
          employeeShare: ZERO,
          employerShare: ZERO,
          quantity: new Prisma.Decimal(vlDebit),
        });
      }
      // Excess tardiness beyond VL credits counts as unpaid workdays.
      const excess = lateDays - vlDebit;
      if (excess > 0) {
        const bucket = gapDaysByEmployee.get(emp.id) ?? 0;
        gapDaysByEmployee.set(emp.id, bucket + excess);
      }
    }

    // LWOP proration (CSC MC No. 8 s. 2014): divisor 22; actual workdays when > 10.
    let unpaidDays = (lwopDaysByEmployee.get(emp.id) ?? 0) + (gapDaysByEmployee.get(emp.id) ?? 0);
    let lwopDeduction = ZERO;
    if (unpaidDays > 0) {
      const divisor = unpaidDays > 10 ? workdaysBetween(start, end) : WORKDAYS_PER_MONTH;
      if (divisor > 0) {
        lwopDeduction = round2(basic.mul(new Prisma.Decimal(unpaidDays).div(divisor)));
        lines.push({
          code: 'LWOP',
          description: `Unpaid leave ${unpaidDays} day(s) (${divisor}-day divisor)`,
          employeeShare: lwopDeduction,
          employerShare: ZERO,
        });
      }
    }

    // Overtime credit (negative share = earnings back to the employee).
    let otPay = ZERO;
    if (otPayByEmployee.has(emp.id)) {
      otPay = otPayByEmployee.get(emp.id);
      const hrs = otHoursByEmployee.get(emp.id) ?? 0;
      lines.push({
        code: 'OT-PAY',
        description: `Overtime ${hrs} hour(s) (CSC-DBM JC 2 s.2015)`,
        employeeShare: otPay.neg(),
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

    const deductions = contribTotal.add(tardinessTotal).add(lwopDeduction).add(loanTotal).add(otPay.neg());
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