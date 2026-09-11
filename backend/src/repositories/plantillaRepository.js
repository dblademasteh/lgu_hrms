import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findPlantillaItems(req, { page=1, limit=50, departmentId, status } = {}) {
  let where = withTenant(req, {});
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.plantillaItem.findMany({
      where,
      skip: (page-1)*limit,
      take: limit,
      include: { position: true, department: true, vacancies: true },
      orderBy: { itemNumber: 'asc' },
    }),
    prisma.plantillaItem.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function findPlantillaItemById(req, id) {
  return prisma.plantillaItem.findUnique({ where: withTenant(req, { id }), include: { position: true, department: true, vacancies: true } });
}

export async function createPlantillaItem(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.plantillaItem.create({ data: stamped, include: { position: true, department: true } });
}

export async function updatePlantillaItem(req, id, data) {
  const stamped = stampTenant(req, data);
  return prisma.plantillaItem.update({ where: withTenant(req, { id }), data: stamped, include: { position: true, department: true } });
}

export async function deletePlantillaItem(req, id) {
  return prisma.plantillaItem.delete({ where: withTenant(req, { id }) });
}
