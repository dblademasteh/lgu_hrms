import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { createLoanSchema, loanIdSchema } from '../shared/contracts/loans.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
const router = Router();

router.get('/', async (req,res,next)=>{
  try{
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const where = {};
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
    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id },
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
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null }, select: { id: true } });
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    const loan = await prisma.loan.create({
      data: {
        employeeId,
        type,
        amount,
        termMonths,
        startDate: new Date(`${startDate}T00:00:00.000Z`),
      },
    });
    res.status(201).json(loan);
  }catch(e){ next(e); }
});

router.delete('/:id', validate(loanIdSchema), async (req,res,next)=>{
  try{
    const existing = await prisma.loan.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Loan not found' } });
    if (existing.status !== 'PENDING') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Only PENDING loans can be deleted' } });
    }
    await prisma.loan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }catch(e){ next(e); }
});

export default router;
