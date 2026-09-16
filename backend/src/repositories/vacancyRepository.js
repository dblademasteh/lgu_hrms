import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { assertInTenant } from './tenantRefs.js';

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
export async function createVacancy(req, data){
  const plantillaItem = await assertInTenant(req, 'plantillaItem', data.plantillaItemId, 'Plantilla item');
  if (plantillaItem && plantillaItem.status !== 'VACANT') {
    const e = new Error(`Plantilla item ${plantillaItem.itemNumber} is not vacant`);
    e.status = 409;
    e.code = 'PLANTILLA_NOT_VACANT';
    throw e;
  }
  const clean = Object.fromEntries(Object.entries(data).filter(([_,v]) => v !== '' && v !== null && v !== undefined));
  return prisma.vacancy.create({ data: stampTenant(req, clean), include:{ plantillaItem:{ include:{ position:true, department:true } } } });
}
export async function updateVacancy(req, id, data){ const scope = withTenant(req, { id }); const existing = await prisma.vacancy.findFirst({ where: scope }); if(!existing){ const e = new Error('Vacancy not found'); e.status = 404; throw e; } const clean = Object.fromEntries(Object.entries(data).filter(([_,v]) => v !== '' && v !== null && v !== undefined));   return prisma.vacancy.update({ where: scope, data: clean, include:{ plantillaItem:{ include:{ position:true, department:true } } } }); }
export async function deleteVacancy(req, id){ const scope = withTenant(req, { id }); const existing = await prisma.vacancy.findFirst({ where: scope }); if(!existing){ const e = new Error('Vacancy not found'); e.status = 404; throw e; }   return prisma.vacancy.delete({ where: scope }); }
