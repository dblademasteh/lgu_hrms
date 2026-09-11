import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findApplicants(req, { page=1, limit=50, search, status }){
  let where = withTenant(req, {});
  if(status) where.status = status;
  if(search){
    where.OR = [
      { firstName:{ contains:search, mode:'insensitive' } },
      { lastName:{ contains:search, mode:'insensitive' } },
      { email:{ contains:search, mode:'insensitive' } }
    ];
  }
  const [items,total] = await Promise.all([
    prisma.applicant.findMany({ where, skip:(page-1)*limit, take:limit, include:{ position:true, department:true }, orderBy:{ createdAt:'desc' } }),
    prisma.applicant.count({ where })
  ]);
  return { items, total, page, limit };
}
export async function createApplicant(req, data){ return prisma.applicant.create({ data: stampTenant(req, data), include:{ position:true, department:true } }); }
export async function updateApplicant(req, id, data){
  const scope = withTenant(req, { id });
  const existing = await prisma.applicant.findFirst({ where: scope });
  if (!existing) { const e = new Error('Applicant not found'); e.status = 404; throw e; }
  const stamped = stampTenant(req, data);
  return prisma.applicant.update({ where: { id }, data: stamped });
}
export async function findEligibilities(req, { page=1, limit=50, employeeId }){
  let where = withTenant(req, {});
  if (employeeId) where.employeeId = employeeId;
  const [items,total] = await Promise.all([
    prisma.eligibility.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true }, orderBy:{ createdAt:'desc' } }),
    prisma.eligibility.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function createEligibility(req, data){ return prisma.eligibility.create({ data: stampTenant(req, data), include:{ employee:true } }); }
