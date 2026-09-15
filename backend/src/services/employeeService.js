import { findEmployees, findEmployeeById, insertEmployee, patchEmployee, softDeleteEmployee } from '../repositories/employeeRepository.js';
import { AppError } from '../lib/errors.js';
import { dispatchWebhooks } from './webhookDispatch.js';
import { prisma } from '../lib/prisma.js';
import { stampTenant, withTenant } from '../middleware/tenant.js';

export async function listEmployees(req, params) {
  return findEmployees(req, params);
}

export async function getEmployee(req, id) {
  const emp = await findEmployeeById(req, id);
  if (!emp) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND');
  }
  return emp;
}

export async function createEmployee(req, data) {
  const emp = await insertEmployee(req, coerceDates(data));
  
  // Dispatch webhook asynchronously - don't block response
  dispatchWebhooks(req.tenantId, 'employee.created', {
    event: 'employee.created',
    tenantId: req.tenantId,
    employeeId: emp.id,
    employeeNumber: emp.employeeNumber,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    status: emp.status,
    timestamp: new Date().toISOString(),
    actorUserId: req.user?.id,
  }).catch(err => console.error('[webhook] dispatch failed:', err));
  
  return emp;
}

export async function updateEmployee(req, id, data) {
  await getEmployee(req, id); // 404 if missing or soft-deleted
  const emp = await patchEmployee(req, id, coerceDates(data));
  
  // Dispatch webhook asynchronously
  dispatchWebhooks(req.tenantId, 'employee.updated', {
    event: 'employee.updated',
    tenantId: req.tenantId,
    employeeId: emp.id,
    employeeNumber: emp.employeeNumber,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    status: emp.status,
    changedFields: Object.keys(data),
    timestamp: new Date().toISOString(),
    actorUserId: req.user?.id,
  }).catch(err => console.error('[webhook] dispatch failed:', err));
  
  return emp;
}

export async function deleteEmployee(req, id) {
  await getEmployee(req, id); // 404 if missing or soft-deleted
  const emp = await findEmployeeById(req, id);
  await softDeleteEmployee(req, id);
  
  // Dispatch webhook asynchronously
  dispatchWebhooks(req.tenantId, 'employee.deleted', {
    event: 'employee.deleted',
    tenantId: req.tenantId,
    employeeId: emp.id,
    employeeNumber: emp.employeeNumber,
    timestamp: new Date().toISOString(),
    actorUserId: req.user?.id,
  }).catch(err => console.error('[webhook] dispatch failed:', err));
  
  return emp;
}

export async function bulkUpsertEmployees(req, items) {
  const tenantId = req.tenantId;
  let created = 0;
  let updated = 0;
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    try {
      const coerced = coerceDates(raw);
      const stamped = stampTenant(req, coerced);
      // Ensure tenant-scoped lookup
      const existing = await prisma.employee.findFirst({
        where: withTenant(req, { employeeNumber: raw.employeeNumber, deletedAt: null }),
        select: { id: true },
      });

      if (existing) {
        await prisma.employee.update({
          where: { id: existing.id },
          data: stamped,
        });
        updated += 1;
      } else {
        await prisma.employee.create({ data: stamped });
        created += 1;
      }
    } catch (e) {
      errors.push({ index: i, employeeNumber: raw.employeeNumber || null, error: e.message || String(e) });
    }
  }

  return { created, updated, errors };
}

/** Prisma @db.Date fields expect ISO-8601 DateTimes, not bare YYYY-MM-DD strings. */
function coerceDates(data) {
  const out = { ...data };
  for (const key of ['birthDate', 'hiredDate']) {
    if (typeof out[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(out[key])) {
      out[key] = new Date(`${out[key]}T00:00:00.000Z`);
    }
  }
  return out;
}
