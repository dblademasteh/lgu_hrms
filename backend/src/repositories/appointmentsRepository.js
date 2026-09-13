import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const appointmentsRepository = {
  async findAll(req) {
    const where = { ...withTenant(req), deletedAt: null };
    return prisma.appointment.findMany({
      where,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, department: { select: { code: true, name: true } }, position: { select: { title: true } } } } },
      orderBy: { startDate: 'desc' }
    });
  },
  async create(req, data) {
    return prisma.appointment.create({ data: stampTenant(req, data) });
  },
  async find(req, id) {
    const where = { ...withTenant(req), id, deletedAt: null };
    return prisma.appointment.findFirst({ where, include: { employee: { include: { department: true, position: true } } } });
  },
  async update(req, id, data) {
    const existing = await prisma.appointment.findFirst({ where: { ...withTenant(req), id, deletedAt: null } });
    if (!existing) { const e = new Error('Appointment not found'); e.status = 404; throw e; }
    return prisma.appointment.update({ where: { id }, data });
  },
  async softRemove(req, id) {
    const existing = await prisma.appointment.findFirst({ where: { ...withTenant(req), id, deletedAt: null } });
    if (!existing) { const e = new Error('Appointment not found'); e.status = 404; throw e; }
    return prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
