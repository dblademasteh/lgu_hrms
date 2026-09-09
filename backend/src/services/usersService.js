import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../lib/errors.js';

export const usersService = {
  async list() {
    return userRepository.findAll();
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

  async create(data) {
    const { username, role, departmentId, displayName, email, contactNumber, externalId } = data;
    await this.assertLinkable(externalId);
    const passwordHash = await bcrypt.hash('changeme', 12);
    return userRepository.create({ username, role, departmentId, displayName, email, contactNumber, externalId, passwordHash });
  },

  async update(id, data) {
    const { passwordHash, ...rest } = data;
    if ('externalId' in rest) await this.assertLinkable(rest.externalId, id);
    return userRepository.update(id, rest);
  },

  async remove(id) {
    return userRepository.delete(id);
  },

  async setStatus(id, status) {
    return userRepository.update(id, { status });
  }
};