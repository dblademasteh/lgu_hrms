import { biometricService } from '../services/biometricService.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

export const biometricController = {
  async enroll(req, res, next) {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const { credentialId, publicKey, deviceName } = req.body;
      if (!credentialId || !publicKey) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'credentialId and publicKey are required' }});
      }

      const record = await biometricService.enroll(req, employee.id, credentialId, publicKey, deviceName);
      res.status(201).json({ credential: record });
    } catch (e) {
      next(e);
    }
  },

  async verify(req, res, next) {
    try {
      const { credentialId, assertion, punchType } = req.body;
      if (!credentialId || !assertion) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'credentialId and assertion are required' }});
      }

      const result = await biometricService.verify(req, credentialId, assertion);
      
      if (punchType) {
        const attendanceResult = await require('../services/attendanceService.js').attendanceService.biometricPunch(req, result.employeeId, punchType);
        return res.json({ ...attendanceResult, verified: true, employee: result });
      }

      res.json({ verified: true, ...result });
    } catch (e) {
      next(e);
    }
  },

  async list(req, res, next) {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const credentials = await biometricService.listForEmployee(req, employee.id);
      res.json({ credentials });
    } catch (e) {
      next(e);
    }
  },

  async remove(req, res, next) {
    try {
      const { credentialId } = req.params;
      const result = await biometricService.remove(req, credentialId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
};
