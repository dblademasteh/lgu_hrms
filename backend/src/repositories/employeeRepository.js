import { prisma } from '../lib/prisma.js';

export async function findEmployees({ page = 1, limit = 50, search, departmentId, status }) {
  const where = { deletedAt: null };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { lastName: 'asc' },
      include: { department: true, position: true },
    }),
    prisma.employee.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function findEmployeeById(id) {
  return prisma.employee.findFirst({
    where: { id, deletedAt: null },
    include: { department: true, position: true, employmentHistory: true },
  });
}

export async function insertEmployee(data) {
  return prisma.employee.create({ data, include: { department: true, position: true } });
}

export async function patchEmployee(id, data) {
  return prisma.employee.update({
    where: { id },
    data,
    include: { department: true, position: true },
  });
}

export async function softDeleteEmployee(id) {
  return prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
}
