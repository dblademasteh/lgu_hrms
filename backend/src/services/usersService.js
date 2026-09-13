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

  /** Validate externalId points to a real, active employee not already linked. */
  async assertLinkable(externalId, excludeUserId) {
    if (!externalId) return;
    const employee = await prisma.employee.findFirst({
      where: { employeeNumber: externalId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, employeeNumber: true },
    });
    if (!employee) {
      throw new AppError(`Employee "${externalId}" not found or inactive`, 400, 'INVALID_LINK');
    }
    const clash = await prisma.user.findFirst({
      where: { externalId, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
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
    const { username, role, departmentId, displayName, email, contactNumber, externalId } = data;
    await this.assertLinkable(externalId);
    await this.assertRoleExists(role, req.tenantId);
    await this.assertDepartmentExists(departmentId, req.tenantId);
    const plain = randomPassword();
    const passwordHash = await bcrypt.hash(plain, 12);
    const stamped = stampTenant(req, { username, role, departmentId, displayName, email, contactNumber, externalId, passwordHash, passwordChangedAt: new Date() });
    const user = await userRepository.create(req, stamped);
    const { passwordHash: _ph, pinHash: _pin, ...safe } = user;
    return { ...safe, temporaryPassword: plain };
  },

  async update(req, id, data) {
    const { passwordHash, pinHash, tenantId, ...rest } = data;
    if ('externalId' in rest) await this.assertLinkable(rest.externalId, id);
    if ('role' in rest) await this.assertRoleExists(rest.role, req.tenantId);
    if ('departmentId' in rest) await this.assertDepartmentExists(rest.departmentId, req.tenantId);
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