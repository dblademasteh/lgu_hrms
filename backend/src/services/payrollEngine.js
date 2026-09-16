import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { manilaMinutes, manilaDateKey } from '../lib/time.js';

const ZERO = new Prisma.Decimal(0);
const WORK_START = 8 * 60;
const WORKDAYS_PER_MONTH = 22;
const HOURS_PER_DAY = 8;
const OT_RATE = { WORKDAY: 1.25, REST_DAY: 1.5, HOLIDAY: 1.5 };

function round2(d) {
  return d.toDecimalPlaces(2);
}

async function loadRules(tenantId, start, end) {
  const inEffect = {
    effectiveFrom: { lte: end },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
  };
  const [contributions, taxBrackets, attendanceRules, allowanceRules] = await Promise.all([
    prisma.contributionRule.findMany({ where: { tenantId, ...inEffect }, orderBy: { type: 'asc' } }),
    prisma.taxBracket.findMany({ where: { tenantId, ...inEffect }, orderBy: { minIncome: 'asc' } }),
    prisma.attendanceRule.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.allowanceRule.findMany({ where: { tenantId, active: true, ...inEffect }, orderBy: { type: 'asc' } }),
  ]);
  return { contributions, taxBrackets, attendanceRules, allowanceRules };
}

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

  const { contributions, taxBrackets, attendanceRules, allowanceRules } = await loadRules(tenantId, start, end);

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

  // --- Attendance
  const attendances = await prisma.attendance.findMany({
    where: { tenantId, date: { gte: start, lte: end } },
    select: { employeeId: true, date: true, timeIn: true },
  });
  const rule0 = attendanceRules[0];
  const scheduledStart = rule0?.workStartMins ?? WORK_START;
  const graceMins = rule0?.tardinessMin ?? 0;

  const lateDaysByEmployee = new Map();
  const attendanceOnDate = new Map();
  const hasAttendanceByEmployee = new Set();
  const officeOpenDays = new Set();
  const presentDaysByEmployee = new Map();
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
    // Track per-employee present workdays (unique dates with a time-in).
    if (a.timeIn) {
      const bucket = presentDaysByEmployee.get(a.employeeId) ?? new Set();
      bucket.add(key);
      presentDaysByEmployee.set(a.employeeId, bucket);
    }
  }

  // Scheduled workdays in the period (Mon–Fri).
  const scheduledWorkdays = workdaysBetween(start, end);

  // --- Approved leave
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
  const leaveCoveredDates = new Map();
  for (const lv of approvedLeaves) {
    const from = new Date(lv.fromDate);
    const to = new Date(lv.toDate);
    const overlapStart = new Date(Math.max(from.getTime(), start.getTime()));
    const overlapEnd = new Date(Math.min(to.getTime(), end.getTime()));
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
      if (dow === 0 || dow === 6) continue;
      covered.add(manilaDateKey(d));
    }
  }

  // --- Attendance gaps
  const gapDaysByEmployee = new Map();
  for (const emp of employees) {
    if (!hasAttendanceByEmployee.has(emp.id)) continue;
    const covered = leaveCoveredDates.get(emp.id) ?? new Set();
    let gaps = 0;
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const key = manilaDateKey(d);
      if (!officeOpenDays.has(key)) continue;
      const present = attendanceOnDate.get(key);
      if (!present?.has(emp.id) && !covered.has(key)) gaps += 1;
    }
    if (gaps > 0) gapDaysByEmployee.set(emp.id, gaps);
  }

  // --- Overtime
  const otEntries = await prisma.overtimeRequest.findMany({
    where: { tenantId, status: 'APPROVED', date: { gte: start, lte: end } },
    select: { employeeId: true, date: true, hours: true, type: true },
  });
  const otPayByEmployee = new Map();
  const otHoursByEmployee = new Map();
  for (const ot of otEntries) {
    const hours = Number(ot.hours);
    if (hours < 2) continue;
    const emp = employees.find(e => e.id === ot.employeeId);
    if (!emp) continue;
    const key = manilaDateKey(ot.date);
    const present = attendanceOnDate.get(key);
    const punched = present?.has(ot.employeeId);
    if (!punched) continue;
    const rowTimes = attendances.filter(a => a.employeeId === ot.employeeId && manilaDateKey(a.date) === key);
    const onTime = rowTimes.some(a => a.timeIn && manilaMinutes(a.timeIn) <= scheduledStart);
    if (!onTime) continue;
    const hr = new Prisma.Decimal(emp.monthlySalary).div(WORKDAYS_PER_MONTH * HOURS_PER_DAY);
    const multiplier = OT_RATE[ot.type] ?? 1.25;
    const pay = round2(hr.mul(hours).mul(multiplier));
    otPayByEmployee.set(ot.employeeId, (otPayByEmployee.get(ot.employeeId) ?? ZERO).add(pay));
    otHoursByEmployee.set(ot.employeeId, (otHoursByEmployee.get(ot.employeeId) ?? 0) + hours);
  }

  // --- VL credits
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
    const presentDays = (presentDaysByEmployee.get(emp.id)?.size ?? 0);
    const divisor = scheduledWorkdays > 0 ? scheduledWorkdays : WORKDAYS_PER_MONTH;
    const basic = presentDays > 0
      ? round2(new Prisma.Decimal(emp.monthlySalary).mul(new Prisma.Decimal(presentDays)).div(divisor))
      : round2(new Prisma.Decimal(emp.monthlySalary));
    const lines = [];
    let contribTotal = ZERO;
    let allowancesTotal = ZERO;

    // Allowances (fixed amounts from active AllowanceRule rows).
    for (const rule of allowanceRules) {
      const amount = new Prisma.Decimal(rule.amount);
      if (amount.gt(ZERO)) {
        allowancesTotal = allowancesTotal.add(amount);
        lines.push({
          code: rule.type.toUpperCase().replace(/[^A-Z0-9]+/g, '-'),
          description: `${rule.type} allowance`,
          employeeShare: amount,
          employerShare: ZERO,
        });
      }
    }

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
      const excess = lateDays - vlDebit;
      if (excess > 0) {
        const bucket = gapDaysByEmployee.get(emp.id) ?? 0;
        gapDaysByEmployee.set(emp.id, bucket + excess);
      }
    }

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

    const deductions = contribTotal.add(lwopDeduction).add(loanTotal).add(otPay.neg());
    const totalDeductions = deductions.add(tax);
    const net = round2(basic.add(allowancesTotal).sub(totalDeductions));

    rows.push({
      employeeId: emp.id,
      basicPay: basic,
      allowances: allowancesTotal,
      deductions: round2(totalDeductions),
      netPay: net,
      lines,
    });
  }

  return { rows, itemIds: [], amortizationIds: [...new Set(amortizationIds)] };
}
