import { prisma } from '../lib/prisma.js';
export async function findDesignations({ page=1, limit=50, employeeId }) {
  const where = employeeId ? { employeeId } : {};
  const [items,total]=await Promise.all([
    prisma.designationOrder.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true, appointment:true, vacancy:true }, orderBy:{ issuedDate:'desc' } }),
    prisma.designationOrder.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function findDesignationById(id){ return prisma.designationOrder.findUnique({ where:{id}, include:{ employee:true, appointment:true, vacancy:true } }); }
export async function createDesignation(data){ return prisma.designationOrder.create({ data, include:{ employee:true } }); }
export async function updateDesignation(id,data){ return prisma.designationOrder.update({ where:{id}, data, include:{ employee:true } }); }
export async function deleteDesignation(id){ return prisma.designationOrder.delete({ where:{id} }); }
