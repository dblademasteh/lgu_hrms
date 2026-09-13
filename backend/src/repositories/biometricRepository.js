import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const biometricRepository = {
  async findByCredentialId(req, credentialId) {
    return prisma.biometricCredential.findFirst({
      where: withTenant(req, { credentialId }),
      include: { employee: true }
    });
  },

  async findByEmployee(req, employeeId) {
    return prisma.biometricCredential.findMany({
      where: withTenant(req, { employeeId }),
      orderBy: { enrolledAt: 'desc' }
    });
  },

  async create(req, data) {
    return prisma.biometricCredential.create({
      data: stampTenant(req, data)
    });
  },

  async updateCounter(req, credentialId, counter) {
    return prisma.biometricCredential.updateMany({
      where: withTenant(req, { credentialId }),
      data: { counter, lastUsedAt: new Date() }
    });
  },

  async delete(req, credentialId) {
    return prisma.biometricCredential.deleteMany({
      where: withTenant(req, { credentialId })
    });
  }
};
