import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { getDepartmentScope, assertDepartmentAccess } from '../middleware/departmentScope.js';

export async function findEmployees(req, { page = 1, limit = 50, search, departmentId, status }) {
  const where = withTenant(req, { deletedAt: null });
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

  // Enforce department scoping: DEPARTMENT_HEAD sees only their department.
  const deptScope = getDepartmentScope(req);
  if (deptScope) {
    where.departmentId = deptScope;
  } else if (departmentId) {
    where.departmentId = departmentId;
  }

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
  const scope = withTenant(req, { id, deletedAt: null });
  const employee = await prisma.employee.findFirst({
    where: scope,
    include: { department: true, position: true, employmentHistory: true },
  });
  if (employee) {
    assertDepartmentAccess(req, employee.departmentId);
  }
  return employee;
}

export async function insertEmployee(req, data) {
  const deptScope = getDepartmentScope(req);
  if (deptScope) {
    // DEPARTMENT_HEAD can only create employees in their own department.
    data.departmentId = deptScope;
  }
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
  assertDepartmentAccess(req, existing.departmentId);

  const deptScope = getDepartmentScope(req);
  if (deptScope) {
    // DEPARTMENT_HEAD cannot reassign employees to another department.
    if (data.departmentId && data.departmentId !== deptScope) {
      const err = new Error('Cannot reassign employee to another department');
      err.status = 403;
      err.code = 'DEPARTMENT_FORBIDDEN';
      throw err;
    }
    data.departmentId = deptScope;
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
  assertDepartmentAccess(req, existing.departmentId);
  return prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
}
