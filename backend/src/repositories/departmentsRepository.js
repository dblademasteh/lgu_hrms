import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const departmentsRepository = {
  async findAll(req) {
    return prisma.department.findMany({
      where: withTenant(req),
      orderBy: { code: 'asc' }
    });
  },
  async create(req, data) {
    return prisma.department.create({ data: stampTenant(req, data) });
  },
  async update(req, id, data) {
    const scope = withTenant(req, { id });
    const existing = await prisma.department.findFirst({ where: scope });
    if (!existing) { const e = new Error('Department not found'); e.status = 404; throw e; }
    return prisma.department.update({ where: { id }, data: stampTenant(req, data) });
  },
  async remove(req, id) {
    const scope = withTenant(req, { id });
    const existing = await prisma.department.findFirst({ where: scope });
    if (!existing) { const e = new Error('Department not found'); e.status = 404; throw e; }
    return prisma.department.delete({ where: { id } });
  }
};