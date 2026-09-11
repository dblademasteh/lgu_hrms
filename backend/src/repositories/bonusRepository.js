import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
export const findBonuses = (req, where = {}) => {
  const scopedWhere = withTenant(req, where);
  return prisma.bonus.findMany({ where: scopedWhere, include:{ employee:true }, orderBy:{ createdAt:'desc' } });
};
export const createBonus = (req, data) => prisma.bonus.create({ data: stampTenant(req, data), include:{ employee:true } });
export const updateBonus = (req, id, data) => {
  const scope = withTenant(req, { id });
  return prisma.bonus.findFirst({ where: scope }).then(existing => {
    if (!existing) { const e = new Error('Bonus not found'); e.status = 404; throw e; }
    const stamped = stampTenant(req, data);
    return prisma.bonus.update({ where: { id }, data: stamped });
  });
};
