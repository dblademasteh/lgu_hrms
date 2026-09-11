import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findVacancies(req, { page=1, limit=50, status, departmentId } = {}) {
  const where = withTenant(req, { status: status || undefined });
  if (departmentId) {
    where.plantillaItem = { departmentId };
  }
  const [items, total] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      skip:(page-1)*limit,
      take:limit,
      include:{ plantillaItem:{ include:{ position:true, department:true } }, publications:true, tenant:true },
      orderBy:{ createdAt:'desc' },
    }),
    prisma.vacancy.count({ where }),
  ]);
  return { items, total, page, limit };
}
export async function findVacancyById(req, id){ return prisma.vacancy.findFirst({ where: withTenant(req, { id }), include:{ plantillaItem:{ include:{ position:true, department:true } }, publications:true, tenant:true } }); }
export async function createVacancy(req, data){ return prisma.vacancy.create({ data: stampTenant(req, data), include:{ plantillaItem:{ include:{ position:true, department:true } } } }); }
export async function updateVacancy(req, id, data){ const scope = withTenant(req, { id }); const existing = await prisma.vacancy.findFirst({ where: scope }); if(!existing){ const e = new Error('Vacancy not found'); e.status = 404; throw e; } return prisma.vacancy.update({ where: { id }, data, include:{ plantillaItem:{ include:{ position:true, department:true } } } }); }
export async function deleteVacancy(req, id){ const scope = withTenant(req, { id }); const existing = await prisma.vacancy.findFirst({ where: scope }); if(!existing){ const e = new Error('Vacancy not found'); e.status = 404; throw e; } return prisma.vacancy.delete({ where: { id } }); }
