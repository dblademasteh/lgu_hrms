import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const appointmentsRepository = {
  async findAll(req) {
    return prisma.appointment.findMany({
      where: withTenant(req),
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { startDate: 'desc' }
    });
  },
  async create(req, data) {
    return prisma.appointment.create({ data: stampTenant(req, data) });
  },
  async update(req, id, data) {
    const scope = withTenant(req, { id });
    const existing = await prisma.appointment.findFirst({ where: scope });
    if (!existing) { const e = new Error('Appointment not found'); e.status = 404; throw e; }
    return prisma.appointment.update({ where: { id }, data });
  },
  async remove(req, id) {
    const scope = withTenant(req, { id });
    const existing = await prisma.appointment.findFirst({ where: scope });
    if (!existing) { const e = new Error('Appointment not found'); e.status = 404; throw e; }
    return prisma.appointment.delete({ where: { id } });
  }
};