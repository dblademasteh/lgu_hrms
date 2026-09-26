import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { Prisma } from '@prisma/client';
import {
  listLoansSchema,
  loanIdSchema,
  createLoanSchema,
} from '../shared/contracts/loans.js';

const router = Router();

// Equal monthly installments from startDate; the last installment absorbs the
// rounding remainder so the schedule always sums to the exact loan amount.
// Month-end dates clamp to the last day of the month (Jan 31 + 1mo = Feb 28),
// which is how salary deductions actually fall.
function addMonthsUtc(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
}

function buildAmortizations(amount, termMonths, startDate) {
  const total = new Prisma.Decimal(amount);
  const base = total.div(termMonths).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  const last = total.minus(base.mul(termMonths - 1));
  return Array.from({ length: termMonths }, (_, i) => ({
    dueDate: addMonthsUtc(startDate, i),
    amount: i === termMonths - 1 ? last : base,
  }));
}

router.use(requirePermission('loansCRUD'));

router.get('/', validate(listLoansSchema), async (req,res,next)=>{
  try{
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    let where = withTenant(req, {});
    if (req.query.employeeId) where.employeeId = req.query.employeeId;
    if (req.query.status) where.status = req.query.status;
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } },
          amortizations: true,
        },
      }),
      prisma.loan.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  }catch(e){ next(e); }
});

router.get('/:id', validate(loanIdSchema), async (req,res,next)=>{
  try{
    const loan = await prisma.loan.findFirst({
      where: withTenant(req, { id: req.params.id }),
      include: {
        employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } },
        amortizations: { orderBy: { dueDate: 'asc' } },
      },
    });
    if (!loan) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Loan not found' } });
    res.json(loan);
  }catch(e){ next(e); }
});

router.post('/', validate(createLoanSchema), async (req,res,next)=>{
  try{
    const { employeeId, type, amount, termMonths, startDate } = req.body;
    const employee = await prisma.employee.findFirst({ where: withTenant(req, { id: employeeId, deletedAt: null }), select: { id: true } });
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    const loan = await prisma.loan.create({
      data: stampTenant(req, {
        employeeId,
        type,
        amount,
        termMonths,
        startDate: new Date(`${startDate}T00:00:00.000Z`),
        amortizations: {
          create: buildAmortizations(amount, termMonths, new Date(`${startDate}T00:00:00.000Z`)).map((a) => ({
            dueDate: a.dueDate,
            amount: a.amount,
          })),
        },
      }),
      include: { amortizations: { orderBy: { dueDate: 'asc' } } },
    });
    res.status(201).json(loan);
  }catch(e){ next(e); }
});

router.delete('/:id', validate(loanIdSchema), async (req,res,next)=>{
  try{
    const existing = await prisma.loan.findFirst({ where: withTenant(req, { id: req.params.id }), select: { id: true, status: true } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Loan not found' } });
    if (existing.status !== 'PENDING') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Only PENDING loans can be deleted' } });
    }
    await prisma.loan.delete({ where: withTenant(req, { id: req.params.id }) });
    res.status(204).end();
  }catch(e){ next(e); }
});

export default router;
