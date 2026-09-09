import { prisma } from '../lib/prisma.js';

export async function findVacancies({ page=1, limit=50, status, departmentId }) {
  const where = { status };
  if (departmentId) {
    where.plantillaItem = { departmentId };
  }
  const [items, total] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      skip:(page-1)*limit,
      take:limit,
      include:{ plantillaItem:{ include:{ position:true, department:true } }, publications:true },
      orderBy:{ createdAt:'desc' },
    }),
    prisma.vacancy.count({ where }),
  ]);
  return { items, total, page, limit };
}
export async function findVacancyById(id){ return prisma.vacancy.findUnique({ where:{id}, include:{ plantillaItem:{ include:{ position:true, department:true } }, publications:true } }); }
export async function createVacancy(data){ return prisma.vacancy.create({ data, include:{ plantillaItem:{ include:{ position:true, department:true } } } }); }
export async function updateVacancy(id,data){ return prisma.vacancy.update({ where:{id}, data, include:{ plantillaItem:{ include:{ position:true, department:true } } } }); }
export async function deleteVacancy(id){ return prisma.vacancy.delete({ where:{id} }); }
