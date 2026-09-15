import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const overtimeRepository = {
  async list(req, { employeeId, date, status, month } = {}) {
    const where = withTenant(req);
    if (employeeId) where.employeeId = employeeId;
    if (date) where.date = new Date(`${date}T00:00:00.000Z`);
    if (status) where.status = status;
    if (month) {
      where.date = {
        gte: new Date(`${month}-01T00:00:00.000Z`),
        lt: new Date(`${month}-01T00:00:00.000Z`).setUTCMonth(new Date(`${month}-01T00:00:00.000Z`).getUTCMonth() + 1),
      };
    }
    return prisma.overtimeRequest.findMany({
      where,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });
  },
  async findById(req, id) {
    return prisma.overtimeRequest.findFirst({
      where: withTenant(req, { id }),
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
    });
  },
  async create(req, data) {
    return prisma.overtimeRequest.create({ data: stampTenant(req, data) });
  },
  async update(req, id, data) {
    return prisma.overtimeRequest.update({ where: { id }, data });
  },
  async softRemove(req, id) {
    return prisma.overtimeRequest.delete({ where: { id } });
  },
  async approve(req, id, data) {
    return prisma.overtimeRequest.update({ where: { id }, data });
  },
};