import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { userRepository } from '../repositories/userRepository.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { AppError } from '../lib/errors.js';

function randomPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const usersService = {
  async list(req) {
    const users = await userRepository.findAll(req);
    return users.map(u => {
      const { passwordHash: _ph, pinHash, ...safe } = u;
      return { ...safe, pinEnabled: !!pinHash };
    });
  },

  /** Validate externalId is a real, active, key-position employee of this tenant, not already linked. */
  async assertLinkable(req, externalId, excludeUserId) {
    if (!externalId) return;
    const employee = await prisma.employee.findFirst({
      where: withTenant(req, { employeeNumber: externalId, deletedAt: null, status: 'ACTIVE' }),
      select: { id: true, employeeNumber: true, keyPosition: true },
    });
    if (!employee) {
      throw new AppError(`Employee "${externalId}" not found or inactive`, 400, 'INVALID_LINK');
    }
    if (!employee.keyPosition?.trim()) {
      throw new AppError(`Employee "${externalId}" is not tagged to a key position — only key positions can be linked`, 400, 'NOT_KEY_POSITION');
    }
    const clash = await prisma.user.findFirst({
      where: withTenant(req, { externalId, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) }),
      select: { id: true, username: true },
    });
    if (clash) {
      throw new AppError(`Employee "${externalId}" is already linked to user "${clash.username}"`, 409, 'LINK_TAKEN');
    }
  },

  async assertRoleExists(role, tenantId) {
    if (!role) return;
    const exists = await prisma.role.findFirst({
      where: { name: role, tenantId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError(`Role "${role}" does not exist for this tenant`, 400, 'INVALID_ROLE');
    }
  },

  async assertDepartmentExists(departmentId, tenantId) {
    if (!departmentId) return;
    const exists = await prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError('Department not found', 400, 'INVALID_DEPARTMENT');
    }
  },

  async create(req, data) {
    if (!req.tenantId) {
      throw new AppError('Select a tenant scope first — user creation requires a tenant', 400, 'TENANT_REQUIRED');
    }
    const { username, role, departmentId, displayName, email, contactNumber, externalId } = data;
    await this.assertLinkable(req, externalId);
    await this.assertRoleExists(role, req.tenantId);
    await this.assertDepartmentExists(departmentId, req.tenantId);
    const plain = randomPassword();
    const passwordHash = await bcrypt.hash(plain, 12);
    const stamped = stampTenant(req, { username, role, departmentId, displayName, email, contactNumber, passwordHash, passwordChangedAt: null });
    const link = externalId ? { linkedEmployee: { connect: { employeeNumber: externalId } } } : {};
    const user = await userRepository.create(req, { ...stamped, ...link });
    const { passwordHash: _ph, pinHash: _pin, ...safe } = user;
    return { ...safe, temporaryPassword: plain };
  },

  async update(req, id, data) {
    if (!req.tenantId) {
      throw new AppError('Select a tenant scope first — user update requires a tenant', 400, 'TENANT_REQUIRED');
    }
    const { passwordHash, pinHash, tenantId, ...rest } = data;
    if ('externalId' in rest) {
      const ext = rest.externalId?.trim();
      await this.assertLinkable(req, ext, id);
      rest.linkedEmployee = ext
        ? { connect: { employeeNumber: ext } }
        : { disconnect: true };
      delete rest.externalId;
    }
    if ('role' in rest) await this.assertRoleExists(rest.role, req.tenantId);
    if ('departmentId' in rest) await this.assertDepartmentExists(rest.departmentId, req.tenantId);
    const existing = await prisma.user.findFirst({ where: withTenant(req, { id }) });
    if (!existing) { const e = new Error('User not found'); e.status = 404; throw e; }
    const user = await userRepository.update(req, id, rest);
    const { passwordHash: _ph, pinHash: _pin, ...safe } = user;
    return safe;
  },

  async remove(req, id) {
    return userRepository.delete(req, id);
  },

  async setStatus(req, id, status) {
    return userRepository.update(req, id, { status });
  }
};