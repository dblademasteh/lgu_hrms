import { payrollRepository } from '../repositories/payrollRepository.js';
import { computeRun } from './payrollEngine.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { withTenant } from '../middleware/tenant.js';

const MONEY = value => new Prisma.Decimal(value ?? 0).toNumber();

/** Normalize dates: Date instances stay as-is; YYYY-MM-DD strings become UTC midnight. */
const toUtcDate = value => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  throw new AppError('Expected YYYY-MM-DD date', 400, 'INVALID_DATE');
};

export const payrollService = {
  async listRuns(req) {
    const q = req.query ?? {};
    return payrollRepository.findRuns(req, {
      page: q.page,
      limit: q.limit,
      summary: q.summary,
    });
  },
  async listPeriods(req) {
    return payrollRepository.findAllPeriods(req);
  },
  async getRun(req, id) {
    return payrollRepository.findRunById(req, id);
  },
  async createPeriod(req, data) {
    const existing = await payrollRepository.findPeriodByName(req, data.name);
    if (existing) throw new AppError('A payroll period with this name already exists', 409, 'CONFLICT');
    if (data.startDate > data.endDate) {
      throw new AppError('Period start must be on or before end date', 400, 'INVALID_PERIOD');
    }
    return payrollRepository.createPeriod(req, {
      name: data.name,
      startDate: toUtcDate(data.startDate),
      endDate: toUtcDate(data.endDate),
      fiscalYear: data.fiscalYear,
    });
  },
  async closePeriod(req, id) {
    const period = await payrollRepository.findPeriodById(req, id);
    if (!period) throw new AppError('Payroll period not found', 404, 'NOT_FOUND');
    if (period.status === 'CLOSED') throw new AppError('Period is already closed', 409, 'CONFLICT');
    return payrollRepository.closePeriod(req, id);
  },
  async createRun(req, data) {
    const period = await payrollRepository.findPeriodById(req, data.periodId);
    if (!period) throw new AppError('Payroll period not found', 404, 'NOT_FOUND');
    if (period.status !== 'OPEN') {
      throw new AppError('Cannot create a run on a closed period', 409, 'PERIOD_CLOSED');
    }
    const existingRun = await payrollRepository.findRunByPeriod(req, data.periodId);
    if (existingRun && existingRun.status !== 'POSTED') {
      throw new AppError('A draft/approved run already exists for this period', 409, 'RUN_EXISTS');
    }
    return payrollRepository.createRun(req, {
      periodId: data.periodId,
      runDate: toUtcDate(data.runDate),
      createdBy: data.createdBy,
      status: 'DRAFT',
    });
  },
  /** DRAFT -> APPROVED. POSTED runs are immutable; APPROVED runs can't re-approve. */
  async approveRun(req, id) {
    const run = await payrollRepository.findRunById(req, id);
    if (!run) throw new AppError('Payroll run not found', 404, 'NOT_FOUND');
    if (run.status !== 'DRAFT') {
      throw new AppError(`Only DRAFT runs can be approved (current: ${run.status})`, 409, 'CONFLICT');
    }
    if (run.items.length === 0) {
      throw new AppError('Cannot approve an empty run — generate items first', 409, 'EMPTY_RUN');
    }
    return payrollRepository.updateRunStatus(req, id, 'APPROVED');
  },
  /** Populate a DRAFT run with computed items + deduction lines. */
  async generateRun(req, id) {
    const run = await payrollRepository.findRunById(req, id);
    if (!run) throw new AppError('Payroll run not found', 404, 'NOT_FOUND');
    if (run.status !== 'DRAFT') {
      throw new AppError('Only DRAFT runs can be generated', 409, `STATE_${run.status}`);
    }
    const period = await payrollRepository.findPeriodById(req, run.periodId);
    if (!period) throw new AppError('Payroll period not found', 404, 'NOT_FOUND');
    if (period.status !== 'OPEN') {
      throw new AppError('Cannot generate on a closed period', 409, 'PERIOD_CLOSED');
    }
    const built = await computeRun(req, period);
    if (built.rows.length === 0) {
      throw new AppError('No active salaried employees to generate — set monthly salary first', 409, 'NO_ITEMS');
    }
    const previousItemIds = run.items.map(i => i.id);
    return payrollRepository.regenerateRun(req, run, { ...built, itemIds: previousItemIds });
  },
  /** APPROVED -> POSTED: writes append-only ledger, payslip rows, marks loans paid. */
  async postRun(req, id) {
    const run = await payrollRepository.findRunById(req, id);
    if (!run) throw new AppError('Payroll run not found', 404, 'NOT_FOUND');
    if (run.status !== 'APPROVED') {
      throw new AppError(`Only APPROVED runs can be posted (current: ${run.status})`, 409, `STATE_${run.status}`);
    }
    if (run.items.length === 0) {
      throw new AppError('Cannot post an empty run', 409, 'EMPTY_RUN');
    }
    const period = run.period;
    // Only amortizations belonging to employees in THIS run are settled at
    // posting; an employee absent from the run must not have loans marked paid.
    const employeeIds = run.items.map(i => i.employeeId);
    const dueAmortizations = await prisma.loanAmortization.findMany({
      where: withTenant(req, {
        paid: false,
        dueDate: { gte: period.startDate, lte: period.endDate },
        loan: { employeeId: { in: employeeIds } },
      }),
      select: { id: true },
    });
    const posting = {
      ledger: [],
      itemIds: [],
      amortizationIds: dueAmortizations.map(a => a.id),
      vlDebits: [], // { employeeId, year, days } — tardiness charged to VL credits
    };
    let balance = new Prisma.Decimal(0);
    for (const item of run.items) {
      balance = balance.add(item.netPay);
      posting.ledger.push({
        tenantId: req.tenantId ?? null,
        runId: run.id,
        employeeId: item.employeeId,
        type: 'PAY',
        amount: item.netPay,
        balance,
        reference: `Payslip item ${item.id.slice(0, 8).toUpperCase()}`,
      });
      posting.itemIds.push(item.id);
      const lines = item.deductionLines ?? [];
      for (const line of lines) {
        const amount = new Prisma.Decimal(line.employeeShare).neg();
        balance = balance.add(amount);
        // Negative shares (overtime credits) become PAY entries; everything
        // else nets out as a DEDUCTION.
        posting.ledger.push({
          tenantId: req.tenantId ?? null,
          runId: run.id,
          employeeId: item.employeeId,
          type: amount.greaterThan(0) ? 'PAY' : 'DEDUCTION',
          amount,
          balance,
          reference: line.code,
        });
        if (line.code.startsWith('ATTD') && Number(line.quantity ?? 0) > 0) {
          posting.vlDebits.push({
            employeeId: item.employeeId,
            year: period.fiscalYear,
            days: Number(line.quantity),
          });
        }
      }
    }
    return payrollRepository.postRun(req, run, posting);
  },
  async getPayslipPrint(req, itemId) {
    const item = await payrollRepository.findPayrollItemForPrint(req, itemId);
    if (!item) throw new AppError('Payslip item not found', 404, 'NOT_FOUND');
    return renderPayslipHtml(item);
  },
  async bankExport(req, runId) {
    const run = await payrollRepository.findRunById(req, runId);
    if (!run) throw new AppError('Payroll run not found', 404, 'NOT_FOUND');
    if (run.status === 'DRAFT') {
      throw new AppError('Bank export is only available for APPROVED or POSTED runs', 409, 'INVALID_STATE');
    }
    const tenant = run.tenant;
    const agencyCode = tenant?.code ? String(tenant.code).slice(0, 8).toUpperCase() : 'LGU';
    const agencyName = tenant?.name ? String(tenant.name).slice(0, 50) : 'LGU';
    const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const lines = [];
    let totalAmount = new Prisma.Decimal(0);
    let totalCount = 0;
    for (const item of run.items) {
      const emp = item.employee;
      const amount = new Prisma.Decimal(item.netPay);
      totalAmount = totalAmount.add(amount);
      totalCount += 1;
      const account = (emp?.bankAccount && String(emp.bankAccount).trim()) || String(emp?.employeeNumber ?? '').slice(0, 20);
      const name = [emp?.firstName, emp?.middleName, emp?.lastName].filter(Boolean).join(' ').slice(0, 50);
      const empNo = String(emp?.employeeNumber ?? '').slice(0, 15);
      const amountStr = amount.toDecimalPlaces(2).toFixed(2).replace(/\./g, '');
      const paddedAmount = amountStr.padStart(15, '0');
      lines.push(
        ['D', name.padEnd(50), account.padEnd(20), paddedAmount, empNo.padEnd(15)].join('').padEnd(200)
      );
    }
    const totalStr = totalAmount.toDecimalPlaces(2).toFixed(2).replace(/\./g, '');
    const paddedTotal = totalStr.padStart(15, '0');
    const header = ['H', agencyCode.padEnd(8), agencyName.padEnd(50), fileDate, paddedTotal, String(totalCount).padStart(6, '0')].join('').padEnd(200);
    const trailer = ['T', String(totalCount).padStart(6, '0'), paddedTotal].join('').padEnd(200);
    const content = [header, ...lines, trailer].join('\n');
    return { content, filename: `LDDAP-${agencyCode}-${fileDate}.txt` };
  },
};

/** Escape values before embedding into the printable document. */
const esc = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmtDate = d => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function renderPayslipHtml(item) {
  const emp = item.employee ?? {};
  const pos = emp.position ?? {};
  const dept = emp.department ?? {};
  const period = item.run?.period ?? {};
  const lines = item.deductionLines ?? [];
  const net = MONEY(item.netPay);
  const deductions = MONEY(item.deductions);
  const credits = lines.filter(l => MONEY(l.employeeShare) < 0);
  const debits = lines.filter(l => MONEY(l.employeeShare) > 0);
  const creditsHtml = credits.length
    ? credits.map(l => `<tr><td>${esc(l.code)}</td><td>${esc(l.description ?? '')}</td><td class="num">${Math.abs(MONEY(l.employeeShare)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>`).join('')
    : '';
  const rowsHtml = debits.length
    ? debits.map(l => `<tr><td>${esc(l.code)}</td><td>${esc(l.description ?? '')}</td><td class="num">${MONEY(l.employeeShare).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>`).join('')
    : '<tr><td colspan="3" class="muted">No deductions for this run.</td></tr>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Payslip · ${esc(emp.employeeNumber)}</title><style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a202c; margin: 2rem auto; max-width: 720px; padding: 0 1rem; }
  header { display:flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a365d; padding-bottom: .75rem; }
  h1 { font-size: 1.25rem; color: #1a365d; margin: 0; } .sub { color:#4a5568; font-size:.8rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; } td, th { padding:.4rem .5rem; border-bottom:1px solid #e2e8f0; text-align:left; }
  th { background:#f1f5f9; } .num { text-align:right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight:600; border-top:2px solid #1a365d; } .muted { color:#718096; }
  @media print { body { margin:0; } }
</style></head><body>
<header>
  <div><h1>Certificate of Compensation</h1><div class="sub">${esc(period.name ?? '')}</div>
  <div class="sub">Period ${fmtDate(period.startDate)} — ${fmtDate(period.endDate)}</div></div>
  <div class="sub">LGU-HRMS</div>
</header>
<section style="margin-top:1rem">
  <table style="border:none">
    <tr><td><strong>Employee:</strong> ${esc(emp.fullName ?? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`)}</td>
        <td><strong>No.:</strong> ${esc(emp.employeeNumber)}</td></tr>
    <tr><td><strong>Position:</strong> ${esc(pos.title ?? '')}</td>
        <td><strong>Dept:</strong> ${esc(dept.name ?? '')}</td></tr>
  </table>
</section>
<section>
  <table>
    <thead><tr><th>Earnings</th><th></th><th class="num">Amount</th></tr></thead>
    <tbody>
      <tr><td>Basic pay</td><td class="muted">monthly</td><td class="num">${MONEY(item.basicPay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>Allowances</td><td></td><td class="num">${MONEY(item.allowances).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
    </tbody>
    ${creditsHtml ? `<tbody>
      <tr><th colspan="2">Additions (${credits.length})</th><th class="num">${credits.reduce((s, l) => s + Math.abs(MONEY(l.employeeShare)), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</th></tr>
      ${creditsHtml}
    </tbody>` : ''}    
    <tbody>
      <tr><th colspan="2">Deductions (${debits.length})</th><th class="num">${deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</th></tr>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr><td colspan="2">Net pay</td><td class="num">${net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td></tr>
    </tfoot>
  </table>
</section>
</body></html>`;
}
