import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findEmployees(req, { page = 1, limit = 50, search, departmentId, status }) {
  const where = withTenant(req, { deletedAt: null });
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

export async function findEmployeeById(req, id) {
  const where = withTenant(req, { id, deletedAt: null });
  return prisma.employee.findFirst({
    where,
    include: { department: true, position: true, employmentHistory: true },
  });
}

export async function insertEmployee(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.employee.create({ data: stamped, include: { department: true, position: true } });
}

export async function patchEmployee(req, id, data) {
  const scope = withTenant(req, { id });
  const existing = await prisma.employee.findFirst({ where: scope });
  if (!existing) {
    const e = new Error('Employee not found');
    e.status = 404;
    throw e;
  }
  const stamped = stampTenant(req, data);
  return prisma.employee.update({
    where: { id },
    data: stamped,
    include: { department: true, position: true },
  });
}

export async function softDeleteEmployee(req, id) {
  const scope = withTenant(req, { id });
  const existing = await prisma.employee.findFirst({ where: scope });
  if (!existing) {
    const e = new Error('Employee not found');
    e.status = 404;
    throw e;
  }
  return prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
}
