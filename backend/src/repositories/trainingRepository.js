import { prisma } from '../lib/prisma.js';

export async function findPrograms({ page=1, limit=50, search }){
  const where = search ? { OR: [{ title:{contains:search,mode:'insensitive'}},{code:{contains:search,mode:'insensitive'}}] } : {};
  const [items,total]=await Promise.all([
    prisma.trainingProgram.findMany({ where, skip:(page-1)*limit, take:limit, orderBy:{ createdAt:'desc' } }),
    prisma.trainingProgram.count({ where })
  ]);
  return { items, total, page, limit };
}
export async function findProgramById(id){ return prisma.trainingProgram.findUnique({ where:{id}, include:{ enrollments:{ include:{ employee:true } } } }); }
export async function createProgram(data){ return prisma.trainingProgram.create({ data }); }
export async function updateProgram(id,data){ return prisma.trainingProgram.update({ where:{id}, data }); }
export async function deleteProgram(id){ return prisma.trainingProgram.delete({ where:{id} }); }

export async function findEnrollments({ page=1, limit=50, employeeId, programId, status }){
  const where={};
  if(employeeId) where.employeeId=employeeId;
  if(programId) where.programId=programId;
  if(status) where.status=status;
  const [items,total]=await Promise.all([
    prisma.trainingEnrollment.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true, program:true }, orderBy:{ enrolledAt:'desc' } }),
    prisma.trainingEnrollment.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function createEnrollment(data){ return prisma.trainingEnrollment.create({ data, include:{ employee:true, program:true } }); }
