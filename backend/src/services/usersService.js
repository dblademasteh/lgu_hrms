import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { userRepository } from '../repositories/userRepository.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { AppError } from '../lib/errors.js';

export const usersService = {
  async list(req) {
    const users = await userRepository.findAll(req);
    return users.map(u => {
      const { passwordHash: _ph, pinHash, ...safe } = u;
      return { ...safe, pinEnabled: !!pinHash };
    });
  },

  /** Validate externalId points to a real, active employee not already linked. */
  async assertLinkable(externalId, excludeUserId) {
    if (!externalId) return;
    const employee = await prisma.employee.findFirst({
      where: { employeeNumber: externalId, deletedAt: null },
      select: { id: true, employeeNumber: true },
    });
    if (!employee) {
      throw new AppError(`Employee "${externalId}" not found`, 400, 'INVALID_LINK');
    }
    const clash = await prisma.user.findFirst({
      where: { externalId, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true, username: true },
    });
    if (clash) {
      throw new AppError(`Employee "${externalId}" is already linked to user "${clash.username}"`, 409, 'LINK_TAKEN');
    }
  },

  async create(req, data) {
    const { username, role, departmentId, displayName, email, contactNumber, externalId } = data;
    await this.assertLinkable(externalId);
    const passwordHash = await bcrypt.hash('changeme', 12);
    const user = await userRepository.create(stampTenant(req, { username, role, departmentId, displayName, email, contactNumber, externalId, passwordHash, passwordChangedAt: new Date() }));
    const { passwordHash: _ph, pinHash: _pin, ...safe } = user;
    return safe;
  },

  async update(req, id, data) {
    // Credential hashes are never mass-assignable through admin update —
    // PIN is self-managed via /auth/pin, password via /account/password.
    const { passwordHash, pinHash, tenantId, ...rest } = data;
    if ('externalId' in rest) await this.assertLinkable(rest.externalId, id);
    // Cross-tenant update guard: the row must belong to the caller's tenant.
    const existing = await prisma.user.findFirst({ where: withTenant(req, { id }) });
    if (!existing) { const e = new Error('User not found'); e.status = 404; throw e; }
    const user = await userRepository.update(id, rest);
    const { passwordHash: _ph, pinHash: _pin, ...safe } = user;
    return safe;
  },

  async remove(id) {
    return userRepository.delete(id);
  },

  async setStatus(id, status) {
    return userRepository.update(id, { status });
  }
};