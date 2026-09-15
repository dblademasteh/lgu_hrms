import { appointmentsRepository } from '../repositories/appointmentsRepository.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

function toUtcDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00.000Z`);
  throw new AppError('Expected YYYY-MM-DD date', 400, 'INVALID_DATE');
}

export const appointmentsService = {
  async list(req) {
    return appointmentsRepository.findAll(req);
  },
  async create(req, data) {
    const employee = await prisma.employee.findFirst({
      where: { ...withTenant(req), id: data.employeeId },
      include: { department: { select: { code: true } }, position: { select: { title: true } } },
    });
    if (!employee) throw new AppError('Employee not found in tenant', 404, 'NOT_FOUND');
    const snapshot = {
      employeeId: employee.id,
      type: data.type,
      itemNumber: data.itemNo,
      startDate: toUtcDate(data.startDate),
      endDate: data.endDate ? toUtcDate(data.endDate) : null,
      status: data.status ?? 'PENDING',
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      position: employee.position?.title ?? null,
      dept: employee.department?.code ?? null,
    };
    return appointmentsRepository.create(req, snapshot);
  },
  async update(req, id, data) {
    const payload = { ...data };
    if (payload.startDate) payload.startDate = toUtcDate(payload.startDate);
    if (payload.endDate) payload.endDate = toUtcDate(payload.endDate);
    return appointmentsRepository.update(req, id, payload);
  },
  async remove(req, id) {
    return appointmentsRepository.softRemove(req, id);
  },
};
