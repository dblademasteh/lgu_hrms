import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { leaveService } from '../services/leaveService.js';
import { leaveRepository } from '../repositories/leaveRepository.js';
import { payrollRepository } from '../repositories/payrollRepository.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
const router = Router();

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
    if (!user?.externalId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    }
    const employee = await prisma.employee.findUnique({
      where: { ...withTenant(req), employeeNumber: user.externalId },
      include: { department: true, position: true, leaveCredits: true }
    });
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    res.json({ employee });
  } catch (e) { next(e); }
});

router.get('/payslips', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
    if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    const items = await prisma.payrollItem.findMany({
      where: withTenant(req, { employeeId: employee.id, run: { is: { status: 'POSTED' } } }),
      include: { run: { include: { period: true } }, deductionLines: true, payslip: true },
      orderBy: { run: { runDate: 'desc' } }
    });
    res.json({ payslips: items });
  } catch (e) { next(e); }
});

router.get('/leave-requests', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
    if (!user?.externalId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
    }
    const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
    if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
    const requests = await leaveRepository.findRequestsByEmployee(req, employee.id);
    res.json({ requests });
  } catch (e) { next(e); }
});

router.post('/leave-requests',
  validate({
    body: z.object({
      type: z.enum(['VACATION', 'SICK', 'SPECIAL_PRIVILEGE', 'MATERNITY', 'PATERNITY', 'SOLO_PARENT', 'SPECIAL_WOMEN', 'COMPENSATORY']),
      fromDate: dateField,
      toDate: dateField,
      days: z.number().positive().max(365),
      reason: z.string().max(500).optional().nullable(),
      isHalfDay: z.boolean().optional(),
      isLwop: z.boolean().optional(),
      isTerminal: z.boolean().optional(),
      advanceNoticed: z.boolean().optional(),
      documentUrl: z.string().max(500).optional().nullable(),
    }),
  }),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      const { type, fromDate, toDate, reason, isHalfDay, isLwop, isTerminal, advanceNoticed, documentUrl } = req.body;
      const created = await leaveService.createRequest(req, {
        employeeId: employee.id,
        type,
        fromDate,
        toDate,
        reason,
        isHalfDay,
        isLwop,
        isTerminal,
        advanceNoticed,
        documentUrl,
      });
      res.status(201).json({ request: created });
    } catch (e) { next(e); }
  }
);

// Payslip documents are issued by lgu-payroll. Employees needing an official
// payslip PDF should open it there; HRMS exposes the mirrored figures read-only.

router.get('/attendance',
  validate({
    query: z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM').optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      const { month } = req.query;
      const start = month ? new Date(`${month}-01`) : new Date(new Date().setDate(1));
      const end = new Date(start);
      end.setMonth(end.getMonth()+1);
      const records = await prisma.attendance.findMany({
        where: withTenant(req, { employeeId: employee.id, date: { gte: start, lt: end } }),
        orderBy: { date: 'desc' }
      });
      res.json({ records });
    } catch (e) { next(e); }
  }
);

export default router;
