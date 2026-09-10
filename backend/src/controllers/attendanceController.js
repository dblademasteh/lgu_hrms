import { attendanceService } from '../services/attendanceService.js';
import { prisma } from '../lib/prisma.js';

export const attendanceController = {
  async list(req, res, next) {
    try {
      const attendance = await attendanceService.list(req.query.date);
      res.json(attendance);
    } catch (e) {
      next(e);
    }
  },
  async create(req, res, next) {
    try {
      const record = await attendanceService.create(req.body);
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
  // Biometric punch in/out - self-service for employees
  async punchBiometric(req, res, next) {
    try {
      const { punchType } = req.body;
      if (!punchType || (punchType !== 'IN' && punchType !== 'OUT')) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'punchType must be IN or OUT' }});
      }

      // Get user's linked employee record
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }

      const employee = await prisma.employee.findUnique({ where: { employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const result = await attendanceService.biometricPunch(employee.id, punchType);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
  // Get my attendance - employee self-service
  async getMyAttendance(req, res, next) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }
      const employee = await prisma.employee.findUnique({ where: { employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const { month } = req.query;
      const records = await attendanceService.listForEmployee(employee.id, month);
      res.json({ records });
    } catch (e) {
      next(e);
    }
  }
};