import { prisma } from '../lib/prisma.js';

export async function findApplicants({ page=1, limit=50, search, status }){
  const where = {};
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
export async function createApplicant(data){ return prisma.applicant.create({ data, include:{ position:true, department:true } }); }
export async function updateApplicant(id,data){ return prisma.applicant.update({ where:{id}, data }); }
export async function findEligibilities({ page=1, limit=50, employeeId }){
  const where = employeeId ? { employeeId } : {};
  const [items,total] = await Promise.all([
    prisma.eligibility.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true }, orderBy:{ createdAt:'desc' } }),
    prisma.eligibility.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function createEligibility(data){ return prisma.eligibility.create({ data, include:{ employee:true } }); }
