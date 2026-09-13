import { biometricRepository } from '../repositories/biometricRepository.js';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const biometricService = {
  async enroll(req, employeeId, credentialId, publicKey, deviceName) {
    const existing = await prisma.biometricCredential.findFirst({
      where: withTenant(req, { credentialId })
    });
    if (existing) {
      throw new Error('Credential already enrolled');
    }

    return biometricRepository.create(req, {
      employeeId,
      credentialId,
      publicKey,
      deviceName: deviceName || null,
    });
  },

  async verify(req, credentialId, assertion) {
    const credential = await biometricRepository.findByCredentialId(req, credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    await biometricRepository.updateCounter(req, credentialId, (credential.counter || 0) + 1);
    return {
      valid: true,
      employeeId: credential.employeeId,
      employeeNumber: credential.employee?.employeeNumber,
      employeeName: `${credential.employee?.firstName ?? ''} ${credential.employee?.lastName ?? ''}`.trim(),
    };
  },

  async listForEmployee(req, employeeId) {
    return biometricRepository.findByEmployee(req, employeeId);
  },

  async remove(req, credentialId) {
    const result = await biometricRepository.delete(req, credentialId);
    if (!result || result.count === 0) {
      throw new Error('Credential not found');
    }
    return { message: 'Credential removed' };
  }
};
