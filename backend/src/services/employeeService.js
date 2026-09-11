import { findEmployees, findEmployeeById, insertEmployee, patchEmployee, softDeleteEmployee } from '../repositories/employeeRepository.js';
import { AppError } from '../lib/errors.js';

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
  return insertEmployee(req, coerceDates(data));
}

export async function updateEmployee(req, id, data) {
  await getEmployee(req, id); // 404 if missing or soft-deleted
  return patchEmployee(req, id, coerceDates(data));
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

export async function deleteEmployee(req, id) {
  await getEmployee(req, id); // 404 if missing or soft-deleted
  return softDeleteEmployee(req, id);
}
