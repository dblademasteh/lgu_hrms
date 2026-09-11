import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
export async function findDesignations(req, { page=1, limit=50, employeeId } = {}) {
  let where = withTenant(req, {});
  if (employeeId) where.employeeId = employeeId;
  const [items,total]=await Promise.all([
    prisma.designationOrder.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true, appointment:true, vacancy:true }, orderBy:{ issuedDate:'desc' } }),
    prisma.designationOrder.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function findDesignationById(req, id){ return prisma.designationOrder.findUnique({ where: withTenant(req, { id }), include:{ employee:true, appointment:true, vacancy:true } }); }
export async function createDesignation(req, data){ const stamped = stampTenant(req, data); return prisma.designationOrder.create({ data: stamped, include:{ employee:true } }); }
export async function updateDesignation(req, id,data){ const stamped = stampTenant(req, data); return prisma.designationOrder.update({ where: withTenant(req, { id }), data: stamped, include:{ employee:true } }); }
export async function deleteDesignation(req, id){ return prisma.designationOrder.delete({ where: withTenant(req, { id }) }); }
