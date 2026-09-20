import { attendanceService } from '../services/attendanceService.js';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/rbac.js';
import { withTenant } from '../middleware/tenant.js';
import { manilaDateKey, dateKeyToUtc, endOfDateKeyExclusive } from '../lib/time.js';
import crypto from 'node:crypto';

export const attendanceController = {
  async list(req, res, next) {
    try {
      const attendance = await attendanceService.list(req, req.query.date);
      res.json(attendance);
    } catch (e) {
      next(e);
    }
  },
  async create(req, res, next) {
    try {
      const record = await attendanceService.create(req, req.body);
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
  async update(req, res, next) {
    try {
      const record = await attendanceService.update(req, req.params.id, req.body);
      if (!record) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attendance record not found' } });
      res.json(record);
    } catch (e) {
      next(e);
    }
  },
  async remove(req, res, next) {
    try {
      const record = await attendanceService.remove(req, req.params.id);
      if (!record) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attendance record not found' } });
      res.json({ message: 'Attendance record deleted' });
    } catch (e) {
      next(e);
    }
  },
  async bulkImport(req, res, next) {
    try {
      const results = await attendanceService.bulkImport(req, req.body.records);
      res.json({ results });
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

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }

      const employee = await prisma.employee.findFirst({
        where: withTenant(req, { employeeNumber: user.externalId }),
      });
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const result = await attendanceService.biometricPunch(req, employee.id, punchType);
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
      const employee = await prisma.employee.findFirst({
        where: withTenant(req, { employeeNumber: user.externalId }),
      });
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const { month } = req.query;
      const records = await attendanceService.listForEmployee(req, employee.id, month);
      res.json({ records });
    } catch (e) {
      next(e);
    }
  },
  // Get today's attendance for quick status check
  async getTodayAttendance(req, res, next) {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const today = new Date();
      const todayKey = manilaDateKey(today);
      const startOfDay = dateKeyToUtc(todayKey);
      const endOfDay = endOfDateKeyExclusive(todayKey);

      // Latest row by timeIn — an open (still-running) row when one exists,
      // otherwise the last closed row. This keeps the portal actionable on
      // multi-punch days (IN → OUT → IN) instead of pinning the first row.
      const record = await prisma.attendance.findFirst({
        where: withTenant(req, {
          employeeId: employee.id,
          date: { gte: startOfDay, lt: endOfDay }
        }),
        orderBy: { timeIn: 'desc' },
      });

      res.json({ record });
    } catch (e) { next(e); }
  },

  // Public biometric punch - no JWT required, uses employeeNumber
  async punchBiometricPublic(req, res, next) {
    try {
      const { employeeNumber, punchType, tenantCode, deviceId, punchKey } = req.body;
      if (!employeeNumber || !punchType || (punchType !== 'IN' && punchType !== 'OUT')) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'employeeNumber and punchType (IN|OUT) are required' }});
      }

      // When the server is configured with a punch key, kiosks must present it.
      const expectedKey = process.env.BIOMETRIC_PUNCH_KEY;
      if (expectedKey) {
        const supplied = typeof punchKey === 'string' ? punchKey : '';
        const a = Buffer.from(supplied);
        const b = Buffer.from(expectedKey);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return res.status(401).json({ error: { code: 'BAD_PUNCH_KEY', message: 'Invalid or missing punch key' }});
        }
      }

      let tenantId = req.tenantId || null;
      if (!tenantId && tenantCode) {
        const tenant = await prisma.tenant.findFirst({
          where: { code: { equals: tenantCode, mode: 'insensitive' } },
        });
        if (!tenant) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' }});
        }
        tenantId = tenant.id;
        req.tenantId = tenantId;
      }
      if (!tenantId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'tenantCode is required for public punch' }});
      }

      const employee = await prisma.employee.findFirst({
        where: { employeeNumber, tenantId }
      });
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const result = await attendanceService.biometricPunch(req, employee.id, punchType);
      res.json({ ...result, employeeNumber, deviceId });
    } catch (e) {
      next(e);
    }
  },

  // Ingest a punch from an external attendance system (API-key authenticated).
  async ingestPunch(req, res, next) {
    try {
      const result = await attendanceService.ingestPunch(req, req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  // Bulk ingest attendance records from an external attendance system.
  async bulkIngest(req, res, next) {
    try {
      const results = await attendanceService.bulkIngest(req, req.body.records);
      res.json({ results });
    } catch (e) {
      next(e);
    }
  }
};
