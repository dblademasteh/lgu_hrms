import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.externalId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    }
    const employee = await prisma.employee.findUnique({
      where: { employeeNumber: user.externalId },
      include: { department: true, position: true, leaveCredits: true }
    });
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    res.json({ employee });
  } catch (e) { next(e); }
});

router.get('/payslips', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    const employee = await prisma.employee.findUnique({ where: { employeeNumber: user.externalId }});
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    const items = await prisma.payrollItem.findMany({
      where: { employeeId: employee.id },
      include: { run: { include: { period: true } }, deductionLines: true, payslip: true },
      orderBy: { run: { runDate: 'desc' } }
    });
    res.json({ payslips: items });
  } catch (e) { next(e); }
});

router.get('/leave-requests', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    const employee = await prisma.employee.findUnique({ where: { employeeNumber: user.externalId }});
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    const requests = await prisma.leaveRequest.findMany({ where: { employeeId: employee.id }, orderBy: { fromDate: 'desc' }});
    res.json({ requests });
  } catch (e) { next(e); }
});

router.post('/leave-requests', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    const employee = await prisma.employee.findUnique({ where: { employeeNumber: user.externalId }});
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    const { type, fromDate, toDate, days, reason } = req.body;
    const reqRec = await prisma.leaveRequest.create({
      data: { employeeId: employee.id, type, fromDate: new Date(fromDate), toDate: new Date(toDate), days, reason, status: 'PENDING' }
    });
    res.status(201).json({ request: reqRec });
  } catch (e) { next(e); }
});

router.get('/attendance', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    const employee = await prisma.employee.findUnique({ where: { employeeNumber: user.externalId }});
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    const { month } = req.query;
    const start = month ? new Date(`${month}-01`) : new Date(new Date().setDate(1));
    const end = new Date(start);
    end.setMonth(end.getMonth()+1);
    const records = await prisma.attendance.findMany({
      where: { employeeId: employee.id, date: { gte: start, lt: end } },
      orderBy: { date: 'desc' }
    });
    res.json({ records });
  } catch (e) { next(e); }
});

export default router;
