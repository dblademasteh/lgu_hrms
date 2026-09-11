import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const attendanceRepository = {
  async findAll(req, date) {
    const baseWhere = date ? { date: { gte: new Date(`${date}T00:00:00Z`), lt: new Date(`${date}T23:59:59Z`) } } : {};
    const where = withTenant(req, baseWhere);
    return prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    });
  },
  async create(req, data) {
    return prisma.attendance.create({ data: stampTenant(req, data) });
  }
};