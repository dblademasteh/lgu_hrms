import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const biometricDeviceUserRepository = {
  async findByDevice(req, deviceId) {
    return prisma.biometricDeviceUser.findMany({
      where: withTenant(req, { deviceId }),
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { deviceUserId: 'asc' },
    });
  },

  async findByEmployee(req, employeeId) {
    return prisma.biometricDeviceUser.findMany({
      where: withTenant(req, { employeeId }),
      include: { device: { select: { id: true, name: true, host: true, port: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByDeviceUser(req, deviceId, deviceUserId) {
    return prisma.biometricDeviceUser.findFirst({
      where: withTenant(req, { deviceId, deviceUserId }),
      include: { employee: true },
    });
  },

  async create(req, data) {
    return prisma.biometricDeviceUser.create({
      data: stampTenant(req, data),
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } }, device: { select: { id: true, name: true } } },
    });
  },

  async update(req, deviceId, deviceUserId, data) {
    return prisma.biometricDeviceUser.update({
      where: withTenant(req, { deviceId, deviceUserId }),
      data,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } }, device: { select: { id: true, name: true } } },
    });
  },

  async delete(req, deviceId, deviceUserId) {
    return prisma.biometricDeviceUser.delete({
      where: withTenant(req, { deviceId, deviceUserId }),
    });
  },
};
