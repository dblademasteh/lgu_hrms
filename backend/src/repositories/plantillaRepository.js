import { prisma } from '../lib/prisma.js';

export async function findPlantillaItems({ page=1, limit=50, departmentId, status }) {
  const where = {};
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

export async function findPlantillaItemById(id) {
  return prisma.plantillaItem.findUnique({ where: { id }, include: { position: true, department: true, vacancies: true } });
}

export async function createPlantillaItem(data) {
  return prisma.plantillaItem.create({ data, include: { position: true, department: true } });
}

export async function updatePlantillaItem(id, data) {
  return prisma.plantillaItem.update({ where: { id }, data, include: { position: true, department: true } });
}

export async function deletePlantillaItem(id) {
  return prisma.plantillaItem.delete({ where: { id } });
}
