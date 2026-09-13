import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { getDepartmentScope } from '../middleware/departmentScope.js';

export const attendanceRepository = {
  async findAll(req, date) {
    const baseWhere = date ? { date: { gte: new Date(`${date}T00:00:00Z`), lt: new Date(`${date}T23:59:59Z`) } } : {};
    const where = withTenant(req, baseWhere);
    
    // DEPARTMENT_HEAD can only see attendance for their department's employees.
    const deptScope = getDepartmentScope(req);
    if (deptScope) {
      where.employee = { departmentId: deptScope };
    }
    
    return prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    });
  },
  async create(req, data) {
    const deptScope = getDepartmentScope(req);
    if (deptScope) {
      const employee = await prisma.employee.findFirst({
        where: { id: data.employeeId, tenantId: req.tenantId },
        select: { departmentId: true },
      });
      if (!employee || employee.departmentId !== deptScope) {
        const err = new Error('Cannot create attendance for employee outside your department');
        err.status = 403;
        err.code = 'DEPARTMENT_FORBIDDEN';
        throw err;
      }
    }
    return prisma.attendance.create({ data: stampTenant(req, data) });
  },
  async update(req, id, data) {
    const scoped = await prisma.attendance.findFirst({ where: withTenant(req, { id }) });
    if (!scoped) return null;
    
    const deptScope = getDepartmentScope(req);
    if (deptScope) {
      const employee = await prisma.employee.findFirst({
        where: { id: scoped.employeeId, tenantId: req.tenantId },
        select: { departmentId: true },
      });
      if (!employee || employee.departmentId !== deptScope) {
        const err = new Error('Cannot update attendance for employee outside your department');
        err.status = 403;
        err.code = 'DEPARTMENT_FORBIDDEN';
        throw err;
      }
    }
    
    return prisma.attendance.update({ where: { id }, data });
  },
  async remove(req, id) {
    const scoped = await prisma.attendance.findFirst({ where: withTenant(req, { id }) });
    if (!scoped) return null;
    
    const deptScope = getDepartmentScope(req);
    if (deptScope) {
      const employee = await prisma.employee.findFirst({
        where: { id: scoped.employeeId, tenantId: req.tenantId },
        select: { departmentId: true },
      });
      if (!employee || employee.departmentId !== deptScope) {
        const err = new Error('Cannot delete attendance for employee outside your department');
        err.status = 403;
        err.code = 'DEPARTMENT_FORBIDDEN';
        throw err;
      }
    }
    
    return prisma.attendance.delete({ where: { id } });
  },
};
