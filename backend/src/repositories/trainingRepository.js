import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findPrograms(req, { page=1, limit=50, search }){
  let where = withTenant(req, {});
  if (search) {
    where.OR = [{ title:{contains:search,mode:'insensitive'}},{code:{contains:search,mode:'insensitive'}}];
  }
  const [items,total]=await Promise.all([
    prisma.trainingProgram.findMany({ where, skip:(page-1)*limit, take:limit, orderBy:{ createdAt:'desc' } }),
    prisma.trainingProgram.count({ where })
  ]);
  return { items, total, page, limit };
}
export async function findProgramById(req, id){ return prisma.trainingProgram.findFirst({ where: withTenant(req, { id }), include:{ enrollments:{ include:{ employee:true } } } }); }
export async function createProgram(req, data){ return prisma.trainingProgram.create({ data: stampTenant(req, data) }); }
export async function updateProgram(req, id, data){
  const scope = withTenant(req, { id });
  const existing = await prisma.trainingProgram.findFirst({ where: scope });
  if (!existing) { const e = new Error('Training program not found'); e.status = 404; throw e; }
  const stamped = stampTenant(req, data);
  return prisma.trainingProgram.update({ where: { id }, data: stamped });
}
export async function deleteProgram(req, id){
  const scope = withTenant(req, { id });
  const existing = await prisma.trainingProgram.findFirst({ where: scope });
  if (!existing) { const e = new Error('Training program not found'); e.status = 404; throw e; }
  return prisma.trainingProgram.delete({ where: { id } });
}

export async function findEnrollments(req, { page=1, limit=50, employeeId, programId, status }){
  let where = withTenant(req, {});
  if(employeeId) where.employeeId=employeeId;
  if(programId) where.programId=programId;
  if(status) where.status=status;
  const [items,total]=await Promise.all([
    prisma.trainingEnrollment.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true, program:true }, orderBy:{ enrolledAt:'desc' } }),
    prisma.trainingEnrollment.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function createEnrollment(req, data){ return prisma.trainingEnrollment.create({ data: stampTenant(req, data), include:{ employee:true, program:true } }); }
