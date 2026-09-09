import { prisma } from '../lib/prisma.js';

export async function findEmployees({ page = 1, limit = 50, search, departmentId, status }) {
  const where = {};
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
  return prisma.employee.findUnique({
    where: { id },
    include: { department: true, position: true, employmentHistory: true },
  });
}
