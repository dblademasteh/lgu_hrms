import { biometricService } from '../services/biometricService.js';
import { attendanceService } from '../services/attendanceService.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { webauthnService } from '../services/webauthnService.js';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

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
      const record = await biometricService.enroll(req, employee.id, credentialId, publicKey, deviceName);
      res.status(201).json({ credential: record });
    } catch (e) {
      next(e);
    }
  },

  async webauthnEnrollOptions(req, res, next) {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const options = await webauthnService.generateEnrollmentOptions(req, employee.id);
      res.json({ options });
    } catch (e) {
      next(e);
    }
  },

  async webauthnEnrollVerify(req, res, next) {
    try {
      const user = await prisma.user.findUnique({ where: { ...withTenant(req), id: req.user.id } });
      if (!user?.externalId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee linkage not found' }});
      }
      const employee = await prisma.employee.findUnique({ where: { ...withTenant(req), employeeNumber: user.externalId }});
      if (!employee) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' }});
      }

      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'credential is required' }});
      }

      let verification;
      try {
        verification = verifyRegistrationResponse({
          credential: {
            id: credential.id,
            rawId: Buffer.from(credential.rawId, 'base64url'),
            response: {
              clientDataJSON: Buffer.from(credential.response.clientDataJSON, 'base64url'),
              attestationObject: Buffer.from(credential.response.attestationObject, 'base64url'),
            },
            type: credential.type,
          },
          challenge: Buffer.from(credential.response.clientDataJSON, 'base64url'),
          rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
          origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173',
          userVerified: true,
        });
      } catch (e) {
        const err = new Error('Biometric enrollment verification failed');
        err.status = 400;
        err.code = 'ENROLLMENT_FAILED';
        throw err;
      }

      if (!verification.verified) {
        const err = new Error('Biometric enrollment verification failed');
        err.status = 400;
        err.code = 'ENROLLMENT_FAILED';
        throw err;
      }

      const credentialId = Buffer.from(verification.credential.id).toString('base64url');
      const publicKey = Buffer.from(verification.credential.publicKey).toString('base64url');

      const record = await webauthnService.verifyEnrollment(req, employee.id, credentialId, publicKey);
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
        const attendanceResult = await attendanceService.biometricPunch(req, result.employeeId, punchType);
        return res.json({ ...attendanceResult, verified: true, employee: result });
      }

      res.json({ verified: true, ...result });
    } catch (e) {
      next(e);
    }
  },

  async getVerifyChallenge(req, res, next) {
    try {
      const { credentialId } = req.query || {};
      if (!credentialId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'credentialId is required' }});
      }
      const { options, credentialId: normalizedCredentialId, employeeId } = await webauthnService.generateAuthenticationOptions(req, credentialId);
      res.json({ options, credentialId: normalizedCredentialId, employeeId });
    } catch (e) {
      next(e);
    }
  },

  async verifyAssertion(req, res, next) {
    try {
      const { credentialId, authenticatorResponse, punchType } = req.body;
      if (!credentialId || !authenticatorResponse) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'credentialId and authenticatorResponse are required' }});
      }

      const result = await webauthnService.verifyAuthentication(req, credentialId, authenticatorResponse);

      if (punchType) {
        const attendanceResult = await attendanceService.biometricPunch(req, result.employeeId, punchType);
        return res.json({ ...attendanceResult, verified: true, employee: result });
      }

      res.json({ verified: true, ...result });
    } catch (e) {
      next(e);
    }
  },

  async list(req, res, next) {
    try {
      const { employeeId } = req.query || {};
      if (employeeId) {
        if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) {
          return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
        }
        const credentials = await biometricService.listForEmployee(req, employeeId);
        return res.json({ credentials, employeeId });
      }
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
